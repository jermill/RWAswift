/**
 * Verification Controller
 * Handles KYC verification requests and status checking
 */

const crypto = require('crypto');
const config = require('../config');
const { calculateRiskScore } = require('../services/riskEngine');
const { triggerVerificationWebhook } = require('../services/webhookService');
const { performFullKYC } = require('../services/mockKYCProvider');
const { sendVerificationStarted, sendVerificationCompleted } = require('../services/emailService');
const webhookController = require('./webhookController');
const db = require('../config/supabase');

/**
 * Simulate async KYC processing
 * @param {string} verificationId - Verification ID
 * @param {object} data - Verification data
 */
async function processVerificationAsync(verificationId, data) {
  // Find verification
  let verification = await db.verifications.findById(verificationId);
  if (!verification) return;
  
  // Update status to processing
  verification = await db.verifications.update(verificationId, {
    status: 'processing',
    processing_started_at: new Date().toISOString()
  });
  
  const startTime = Date.now();
  
  // Perform mock KYC verification
  let kycResult;
  if (config.features.mockKycEnabled) {
    kycResult = await performFullKYC({
      investorEmail: verification.investor_email,
      investorFirstName: verification.investor_first_name,
      investorLastName: verification.investor_last_name,
      investorCountry: verification.investor_country,
      investorDateOfBirth: data.dateOfBirth
    });
  }
  
  // Calculate risk score using risk engine
  const { verifications: recentVerifications } = await db.verifications.findByOrganization(verification.org_id, 100, 0);
  
  const riskAssessment = calculateRiskScore({
    investorEmail: verification.investor_email,
    investorCountry: verification.investor_country,
    investorIpAddress: verification.investor_ip_address,
    recentVerifications
  });
  
  // Combine KYC and risk assessment for final decision
  const kycPassed = !kycResult || kycResult.status === 'passed';
  const riskPassed = riskAssessment.shouldApprove;
  const isApproved = kycPassed && riskPassed;
  
  const processingTime = Date.now() - startTime;
  
  // Set decision reason
  let decisionReason;
  if (isApproved) {
    decisionReason = 'All verification checks passed';
  } else {
    const reasons = [];
    if (!kycPassed && kycResult) {
      reasons.push(...(kycResult.decision?.reasons || ['KYC verification failed']));
    }
    if (riskAssessment.factors.length > 0) {
      reasons.push(...riskAssessment.factors);
    }
    decisionReason = reasons.length > 0 
      ? reasons.join('; ')
      : 'High risk indicators detected';
  }
  
  // Update verification with risk data in database
  verification = await db.verifications.update(verificationId, {
    status: isApproved ? 'approved' : 'rejected',
    decision: isApproved ? 'approved' : 'rejected',
    risk_score: riskAssessment.score,
    risk_level: riskAssessment.level,
    risk_reasons: riskAssessment.factors,
    decision_made_at: new Date().toISOString(),
    decision_reason: decisionReason,
    processing_completed_at: new Date().toISOString(),
    processing_time_ms: processingTime,
    persona_inquiry_id: kycResult?.inquiryId,
    persona_status: kycResult?.status
  });
  
  console.log(`✅ Verification ${verificationId} completed: ${verification.decision} (${verification.risk_score}/100)`);
  
  // Send completion email (non-blocking)
  sendVerificationCompleted(verification.investor_email, verification).catch(err =>
    console.error('Email send error:', err)
  );
  
  // Trigger webhook notification
  try {
    const webhooks = await db.webhooks.findByOrganization(verification.org_id);
    await triggerVerificationWebhook(
      verification.org_id,
      verification,
      webhooks
    );
    
    await db.verifications.update(verificationId, {
      webhook_delivered: true,
      webhook_delivered_at: new Date().toISOString(),
      webhook_attempts: (verification.webhook_attempts || 0) + 1
    });
  } catch (webhookError) {
    console.error('Webhook delivery error:', webhookError);
    await db.verifications.update(verificationId, {
      webhook_delivered: false,
      webhook_attempts: (verification.webhook_attempts || 0) + 1
    });
  }
}

/**
 * Create new verification
 * POST /api/v1/verify
 */
exports.createVerification = async (req, res) => {
  try {
    const { org } = req;
    const { 
      email, 
      firstName, 
      lastName, 
      country, 
      dateOfBirth,
      documents 
    } = req.body;
    
    // Validation
    if (!email) {
      return res.status(400).json({
        error: {
          message: 'Investor email is required',
          code: 'MISSING_EMAIL'
        }
      });
    }
    
    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        error: {
          message: 'Invalid email format',
          code: 'INVALID_EMAIL'
        }
      });
    }
    
    // Create verification record in database
    const verification = await db.verifications.create({
      organization_id: org.id,
      email: email.toLowerCase(),
      first_name: firstName || null,
      last_name: lastName || null,
      country: country || null,
      ip_address: req.ip || req.connection.remoteAddress,
      status: 'pending',
      user_agent: req.headers['user-agent'],
      metadata: req.body.metadata || {}
    });
    
    // Send verification started email (non-blocking)
    sendVerificationStarted(email, verification).catch(err => 
      console.error('Email send error:', err)
    );
    
    // Start async processing
    processVerificationAsync(verification.id, { dateOfBirth }).catch(async (error) => {
      console.error('Verification processing error:', error);
      await db.verifications.update(verification.id, {
        status: 'failed',
        decision_reason: 'Processing error'
      });
    });
    
    // Return immediate response
    res.status(201).json({
      message: 'Verification started',
      verification: {
        id: verification.id,
        status: verification.status,
        investorEmail: verification.investor_email,
        estimatedTime: '2 minutes',
        createdAt: verification.created_at
      },
      links: {
        status: `/api/v1/verify/${verification.id}`,
        self: `/api/v1/verify/${verification.id}`
      }
    });
    
  } catch (error) {
    console.error('Create verification error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to create verification',
        code: 'VERIFICATION_ERROR',
        details: config.isDevelopment ? error.message : undefined
      }
    });
  }
};

/**
 * Get verification by ID
 * GET /api/v1/verify/:id
 */
exports.getVerification = async (req, res) => {
  try {
    const { org } = req;
    const { id } = req.params;
    
    // Find verification
    const verification = await db.verifications.findById(id);
    
    if (!verification || verification.org_id !== org.id) {
      return res.status(404).json({
        error: {
          message: 'Verification not found',
          code: 'NOT_FOUND'
        }
      });
    }
    
    // Return verification details
    res.json({
      verification: {
        id: verification.id,
        status: verification.status,
        investor: {
          email: verification.investor_email,
          firstName: verification.investor_first_name,
          lastName: verification.investor_last_name,
          country: verification.investor_country
        },
        risk: {
          score: verification.risk_score,
          level: verification.risk_level,
          reasons: verification.risk_reasons
        },
        decision: {
          result: verification.decision,
          reason: verification.decision_reason,
          madeAt: verification.decision_made_at,
          madeBy: verification.decision_made_by
        },
        processing: {
          startedAt: verification.processing_started_at,
          completedAt: verification.processing_completed_at,
          timeMs: verification.processing_time_ms
        },
        createdAt: verification.created_at,
        updatedAt: verification.updated_at
      }
    });
    
  } catch (error) {
    console.error('Get verification error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get verification',
        code: 'GET_ERROR',
        details: config.isDevelopment ? error.message : undefined
      }
    });
  }
};

/**
 * List verifications
 * GET /api/v1/verify
 */
exports.listVerifications = async (req, res) => {
  try {
    const { org } = req;
    const { 
      limit = 50, 
      offset = 0
    } = req.query;
    
    // Get org verifications with pagination
    const { verifications, total } = await db.verifications.findByOrganization(
      org.id,
      parseInt(limit),
      parseInt(offset)
    );
    
    // Format response
    const formattedVerifications = verifications.map(v => ({
      id: v.id,
      status: v.status,
      investorEmail: v.investor_email,
      investorCountry: v.investor_country,
      decision: v.decision,
      riskScore: v.risk_score,
      riskLevel: v.risk_level,
      processingTimeMs: v.processing_time_ms,
      createdAt: v.created_at
    }));
    
    res.json({
      verifications: formattedVerifications,
      pagination: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        hasMore: total > parseInt(offset) + parseInt(limit)
      }
    });
    
  } catch (error) {
    console.error('List verifications error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to list verifications',
        code: 'LIST_ERROR',
        details: config.isDevelopment ? error.message : undefined
      }
    });
  }
};

/**
 * Get verification statistics
 * GET /api/v1/verify/stats
 */
exports.getStats = async (req, res) => {
  try {
    const { org } = req;
    
    // Get stats from database
    const stats = await db.verifications.getStats(org.id);
    
    // Get all verifications for processing time calculation
    const { verifications } = await db.verifications.findByOrganization(org.id, 1000, 0);
    const completedVerifications = verifications.filter(v => v.processing_time_ms);
    const avgProcessingTime = completedVerifications.length > 0
      ? Math.round(completedVerifications.reduce((sum, v) => sum + v.processing_time_ms, 0) / completedVerifications.length)
      : null;
    
    // Calculate approval rate
    const decidedVerifications = stats.approved + stats.rejected;
    const approvalRate = decidedVerifications > 0
      ? Math.round((stats.approved / decidedVerifications) * 100)
      : null;
    
    res.json({
      stats: {
        total: stats.total,
        approved: stats.approved,
        rejected: stats.rejected,
        pending: stats.pending + stats.processing,
        approvalRate,
        avgProcessingTime,
        riskDistribution: stats.risk_distribution
      },
      usage: {
        monthly: org.monthly_usage || 0,
        limit: org.monthly_limit || 100,
        remaining: (org.monthly_limit || 100) - (org.monthly_usage || 0),
        percentage: Math.round(((org.monthly_usage || 0) / (org.monthly_limit || 100)) * 100)
      }
    });
    
  } catch (error) {
    console.error('Get stats error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get statistics',
        code: 'STATS_ERROR',
        details: config.isDevelopment ? error.message : undefined
      }
    });
  }
};



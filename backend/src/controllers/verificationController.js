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

// Mock database for verifications
const mockDatabase = {
  verifications: []
};

/**
 * Simulate async KYC processing
 * @param {string} verificationId - Verification ID
 * @param {object} data - Verification data
 */
async function processVerificationAsync(verificationId, data) {
  // Find verification
  const verification = mockDatabase.verifications.find(v => v.id === verificationId);
  if (!verification) return;
  
  // Update status to processing
  verification.status = 'processing';
  verification.processingStartedAt = new Date().toISOString();
  
  const startTime = Date.now();
  
  // Perform mock KYC verification
  let kycResult;
  if (config.features.mockKycEnabled) {
    kycResult = await performFullKYC({
      investorEmail: verification.investorEmail,
      investorFirstName: verification.investorFirstName,
      investorLastName: verification.investorLastName,
      investorCountry: verification.investorCountry,
      investorDateOfBirth: data.dateOfBirth
    });
    
    // Store KYC provider data
    verification.personaInquiryId = kycResult.inquiryId;
    verification.personaStatus = kycResult.status;
  }
  
  // Calculate risk score using risk engine
  const recentVerifications = mockDatabase.verifications.filter(v => 
    v.orgId === verification.orgId && v.id !== verification.id
  );
  
  const riskAssessment = calculateRiskScore({
    investorEmail: verification.investorEmail,
    investorCountry: verification.investorCountry,
    investorIpAddress: verification.investorIpAddress,
    recentVerifications
  });
  
  // Combine KYC and risk assessment for final decision
  const kycPassed = !kycResult || kycResult.status === 'passed';
  const riskPassed = riskAssessment.shouldApprove;
  const isApproved = kycPassed && riskPassed;
  
  const processingTime = Date.now() - startTime;
  
  // Update verification with risk data
  verification.status = isApproved ? 'approved' : 'rejected';
  verification.decision = isApproved ? 'approved' : 'rejected';
  verification.riskScore = riskAssessment.score;
  verification.riskLevel = riskAssessment.level;
  verification.riskReasons = riskAssessment.factors;
  verification.decisionMadeAt = new Date().toISOString();
  verification.processingCompletedAt = new Date().toISOString();
  verification.processingTimeMs = processingTime;
  
  // Set decision reason
  if (isApproved) {
    verification.decisionReason = 'All verification checks passed';
  } else {
    const reasons = [];
    if (!kycPassed && kycResult) {
      reasons.push(...(kycResult.decision?.reasons || ['KYC verification failed']));
    }
    if (riskAssessment.factors.length > 0) {
      reasons.push(...riskAssessment.factors);
    }
    verification.decisionReason = reasons.length > 0 
      ? reasons.join('; ')
      : 'High risk indicators detected';
  }
  
  console.log(`✅ Verification ${verificationId} completed: ${verification.decision} (${verification.riskScore}/100)`);
  
  // Send completion email (non-blocking)
  sendVerificationCompleted(verification.investorEmail, verification).catch(err =>
    console.error('Email send error:', err)
  );
  
  // Trigger webhook notification
  try {
    await triggerVerificationWebhook(
      verification.orgId,
      verification,
      webhookController._mockDatabase.webhooks
    );
    verification.webhookDelivered = true;
    verification.webhookDeliveredAt = new Date().toISOString();
  } catch (webhookError) {
    console.error('Webhook delivery error:', webhookError);
    verification.webhookDelivered = false;
  }
  verification.webhookAttempts += 1;
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
    
    // Create verification record
    const verification = {
      id: crypto.randomUUID(),
      orgId: org.id,
      investorEmail: email.toLowerCase(),
      investorFirstName: firstName || null,
      investorLastName: lastName || null,
      investorCountry: country || null,
      investorIpAddress: req.ip || req.connection.remoteAddress,
      status: 'pending',
      riskScore: null,
      riskLevel: null,
      riskReasons: [],
      decision: null,
      decisionReason: null,
      decisionMadeAt: null,
      decisionMadeBy: 'system',
      processingStartedAt: null,
      processingCompletedAt: null,
      processingTimeMs: null,
      webhookDelivered: false,
      webhookAttempts: 0,
      userAgent: req.headers['user-agent'],
      metadata: req.body.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
  // Store in mock database
    mockDatabase.verifications.push(verification);
    
    // Send verification started email (non-blocking)
    sendVerificationStarted(email, verification).catch(err => 
      console.error('Email send error:', err)
    );
    
    // Start async processing
    processVerificationAsync(verification.id, verification).catch(error => {
      console.error('Verification processing error:', error);
      verification.status = 'failed';
      verification.decisionReason = 'Processing error';
    });
    
    // Return immediate response
    res.status(201).json({
      message: 'Verification started',
      verification: {
        id: verification.id,
        status: verification.status,
        investorEmail: verification.investorEmail,
        estimatedTime: '2 minutes',
        createdAt: verification.createdAt
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
    const verification = mockDatabase.verifications.find(
      v => v.id === id && v.orgId === org.id
    );
    
    if (!verification) {
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
          email: verification.investorEmail,
          firstName: verification.investorFirstName,
          lastName: verification.investorLastName,
          country: verification.investorCountry
        },
        risk: {
          score: verification.riskScore,
          level: verification.riskLevel,
          reasons: verification.riskReasons
        },
        decision: {
          result: verification.decision,
          reason: verification.decisionReason,
          madeAt: verification.decisionMadeAt,
          madeBy: verification.decisionMadeBy
        },
        processing: {
          startedAt: verification.processingStartedAt,
          completedAt: verification.processingCompletedAt,
          timeMs: verification.processingTimeMs
        },
        createdAt: verification.createdAt,
        updatedAt: verification.updatedAt
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
      status, 
      limit = 50, 
      offset = 0,
      email,
      country,
      decision
    } = req.query;
    
    // Get org verifications
    let verifications = mockDatabase.verifications.filter(v => v.orgId === org.id);
    
    // Apply filters
    if (status) {
      verifications = verifications.filter(v => v.status === status);
    }
    if (email) {
      verifications = verifications.filter(v => 
        v.investorEmail.toLowerCase().includes(email.toLowerCase())
      );
    }
    if (country) {
      verifications = verifications.filter(v => v.investorCountry === country);
    }
    if (decision) {
      verifications = verifications.filter(v => v.decision === decision);
    }
    
    // Sort by created date (newest first)
    verifications.sort((a, b) => 
      new Date(b.createdAt) - new Date(a.createdAt)
    );
    
    // Pagination
    const total = verifications.length;
    verifications = verifications.slice(
      parseInt(offset), 
      parseInt(offset) + parseInt(limit)
    );
    
    // Format response
    const formattedVerifications = verifications.map(v => ({
      id: v.id,
      status: v.status,
      investorEmail: v.investorEmail,
      investorCountry: v.investorCountry,
      decision: v.decision,
      riskScore: v.riskScore,
      riskLevel: v.riskLevel,
      processingTimeMs: v.processingTimeMs,
      createdAt: v.createdAt
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
    
    // Get org verifications
    const verifications = mockDatabase.verifications.filter(v => v.orgId === org.id);
    
    // Calculate stats
    const total = verifications.length;
    const approved = verifications.filter(v => v.decision === 'approved').length;
    const rejected = verifications.filter(v => v.decision === 'rejected').length;
    const pending = verifications.filter(v => v.status === 'pending' || v.status === 'processing').length;
    
    // Calculate average processing time
    const completedVerifications = verifications.filter(v => v.processingTimeMs);
    const avgProcessingTime = completedVerifications.length > 0
      ? Math.round(completedVerifications.reduce((sum, v) => sum + v.processingTimeMs, 0) / completedVerifications.length)
      : null;
    
    // Calculate approval rate
    const decidedVerifications = approved + rejected;
    const approvalRate = decidedVerifications > 0
      ? Math.round((approved / decidedVerifications) * 100)
      : null;
    
    // Risk level distribution
    const riskDistribution = {
      low: verifications.filter(v => v.riskLevel === 'low').length,
      medium: verifications.filter(v => v.riskLevel === 'medium').length,
      high: verifications.filter(v => v.riskLevel === 'high').length
    };
    
    res.json({
      stats: {
        total,
        approved,
        rejected,
        pending,
        approvalRate,
        avgProcessingTime,
        riskDistribution
      },
      usage: {
        monthly: org.monthlyUsage || 0,
        limit: org.monthlyLimit || 100,
        remaining: (org.monthlyLimit || 100) - (org.monthlyUsage || 0),
        percentage: Math.round(((org.monthlyUsage || 0) / (org.monthlyLimit || 100)) * 100)
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

// Export mock database for testing
exports._mockDatabase = mockDatabase;


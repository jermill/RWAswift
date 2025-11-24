/**
 * Mock KYC Provider Service
 * Simulates external KYC provider like Persona API
 * In production, replace with real Persona/Onfido/Sumsub integration
 */

const axios = require('axios');
const crypto = require('crypto');
const config = require('../config');

/**
 * Create KYC inquiry (simulates Persona API)
 * @param {object} investorData - Investor information
 * @returns {Promise<object>} Inquiry result
 */
async function createInquiry(investorData) {
  const {
    email,
    firstName,
    lastName,
    country,
    dateOfBirth,
    phoneNumber
  } = investorData;

  // Simulate API delay
  await sleep(Math.random() * 1000 + 500); // 0.5-1.5 seconds

  // Generate mock inquiry ID
  const inquiryId = `inq_${crypto.randomBytes(16).toString('hex')}`;

  // Simulate different outcomes based on email patterns
  const emailLower = email.toLowerCase();
  
  // Failure scenarios for testing
  if (emailLower.includes('fail') || emailLower.includes('reject')) {
    return {
      success: false,
      inquiryId,
      status: 'failed',
      reason: 'Document verification failed',
      details: {
        documentQuality: 'poor',
        faceMatch: false,
        livenessCheck: false
      }
    };
  }

  // Manual review scenarios
  if (emailLower.includes('review') || emailLower.includes('pending')) {
    return {
      success: true,
      inquiryId,
      status: 'pending_review',
      reason: 'Manual review required',
      details: {
        documentQuality: 'acceptable',
        faceMatch: true,
        livenessCheck: 'inconclusive'
      }
    };
  }

  // Success scenario (default)
  return {
    success: true,
    inquiryId,
    status: 'completed',
    reason: 'Identity verified',
    details: {
      documentType: 'passport',
      documentNumber: `DOC${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
      documentQuality: 'high',
      faceMatch: true,
      livenessCheck: true,
      extractedData: {
        firstName: firstName || 'JOHN',
        lastName: lastName || 'DOE',
        dateOfBirth: dateOfBirth || '1990-01-01',
        nationality: country || 'USA',
        documentExpiry: '2030-12-31'
      }
    }
  };
}

/**
 * Get inquiry status (simulates polling Persona API)
 * @param {string} inquiryId - Inquiry ID
 * @returns {Promise<object>} Inquiry status
 */
async function getInquiryStatus(inquiryId) {
  // Simulate API delay
  await sleep(100);

  // Mock response based on inquiry ID
  return {
    inquiryId,
    status: 'completed',
    verificationStatus: 'approved',
    createdAt: new Date().toISOString(),
    completedAt: new Date().toISOString()
  };
}

/**
 * Verify document (simulates document OCR/verification)
 * @param {object} document - Document data
 * @returns {Promise<object>} Verification result
 */
async function verifyDocument(document) {
  const { type, imageData, side } = document;

  // Simulate processing time
  await sleep(Math.random() * 2000 + 1000); // 1-3 seconds

  // Simulate OCR extraction
  const extractedData = {
    documentType: type || 'passport',
    firstName: 'JOHN',
    lastName: 'DOE',
    documentNumber: `DOC${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
    dateOfBirth: '1990-01-01',
    issueDate: '2020-01-01',
    expiryDate: '2030-12-31',
    nationality: 'USA',
    confidence: 0.95
  };

  // Simulate validation checks
  const validationChecks = {
    documentAuthenticity: {
      passed: true,
      confidence: 0.97,
      checks: ['hologram', 'watermark', 'microprint', 'uvFeatures']
    },
    documentIntegrity: {
      passed: true,
      issues: []
    },
    dataConsistency: {
      passed: true,
      conflicts: []
    }
  };

  return {
    success: true,
    extractedData,
    validationChecks,
    qualityScore: 0.95,
    processingTime: Math.floor(Math.random() * 2000 + 1000)
  };
}

/**
 * Perform liveness check (simulates face liveness detection)
 * @param {object} faceData - Face image data
 * @returns {Promise<object>} Liveness result
 */
async function performLivenessCheck(faceData) {
  // Simulate processing
  await sleep(Math.random() * 1500 + 500); // 0.5-2 seconds

  // 95% success rate for liveness
  const isLive = Math.random() < 0.95;

  return {
    success: true,
    isLive,
    confidence: isLive ? 0.98 : 0.45,
    checks: {
      eyeMovement: isLive,
      headMovement: isLive,
      blinkDetection: isLive,
      depthAnalysis: isLive
    },
    spoofingAttempt: !isLive
  };
}

/**
 * Match face to document (simulates face matching)
 * @param {object} faceImage - Selfie image
 * @param {object} documentImage - Document photo
 * @returns {Promise<object>} Match result
 */
async function matchFaceToDocument(faceImage, documentImage) {
  // Simulate processing
  await sleep(Math.random() * 1000 + 500);

  // 90% match rate
  const isMatch = Math.random() < 0.90;
  const similarityScore = isMatch 
    ? Math.random() * 0.2 + 0.8  // 0.8-1.0 for matches
    : Math.random() * 0.4 + 0.3; // 0.3-0.7 for non-matches

  return {
    success: true,
    isMatch,
    similarityScore,
    threshold: 0.75,
    confidence: 0.95
  };
}

/**
 * Check PEP (Politically Exposed Person) status
 * @param {object} personalData - Personal information
 * @returns {Promise<object>} PEP check result
 */
async function checkPEPStatus(personalData) {
  const { firstName, lastName, dateOfBirth, country } = personalData;

  // Simulate API call
  await sleep(500);

  // Mock PEP patterns for testing
  const fullName = `${firstName} ${lastName}`.toLowerCase();
  const isPEP = fullName.includes('president') || 
                fullName.includes('minister') || 
                fullName.includes('politician');

  return {
    success: true,
    isPEP,
    pepLevel: isPEP ? 'high' : 'none', // none, low, medium, high
    matches: isPEP ? [{
      name: `${firstName} ${lastName}`,
      position: 'Government Official',
      country: country || 'Unknown',
      source: 'Mock PEP Database',
      confidence: 0.85
    }] : [],
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Perform adverse media check
 * @param {object} personalData - Personal information
 * @returns {Promise<object>} Adverse media result
 */
async function checkAdverseMedia(personalData) {
  const { firstName, lastName } = personalData;

  // Simulate API call
  await sleep(500);

  // Mock adverse media patterns
  const fullName = `${firstName} ${lastName}`.toLowerCase();
  const hasAdverseMedia = fullName.includes('criminal') || 
                          fullName.includes('fraud') || 
                          fullName.includes('scandal');

  return {
    success: true,
    hasAdverseMedia,
    riskLevel: hasAdverseMedia ? 'high' : 'low',
    articles: hasAdverseMedia ? [{
      title: 'Mock Adverse Media Article',
      source: 'Mock News Source',
      date: '2024-01-01',
      snippet: 'Sample adverse media content for testing',
      url: 'https://example.com/news'
    }] : [],
    totalResults: hasAdverseMedia ? 1 : 0
  };
}

/**
 * Complete KYC verification workflow
 * @param {object} verificationData - Complete verification data
 * @returns {Promise<object>} Complete KYC result
 */
async function performFullKYC(verificationData) {
  const {
    investorEmail,
    investorFirstName,
    investorLastName,
    investorCountry,
    investorDateOfBirth
  } = verificationData;

  console.log(`🔍 Starting mock KYC for ${investorEmail}`);

  try {
    // Step 1: Create inquiry
    const inquiry = await createInquiry({
      email: investorEmail,
      firstName: investorFirstName,
      lastName: investorLastName,
      country: investorCountry,
      dateOfBirth: investorDateOfBirth
    });

    if (!inquiry.success) {
      return {
        success: false,
        provider: 'mock-kyc',
        inquiryId: inquiry.inquiryId,
        status: 'failed',
        reason: inquiry.reason,
        details: inquiry.details
      };
    }

    // Step 2: Check PEP status
    const pepCheck = await checkPEPStatus({
      firstName: investorFirstName || 'Unknown',
      lastName: investorLastName || 'Unknown',
      dateOfBirth: investorDateOfBirth,
      country: investorCountry
    });

    // Step 3: Check adverse media
    const mediaCheck = await checkAdverseMedia({
      firstName: investorFirstName || 'Unknown',
      lastName: investorLastName || 'Unknown'
    });

    // Determine final decision
    const isPassed = inquiry.status === 'completed' && 
                     !pepCheck.isPEP && 
                     !mediaCheck.hasAdverseMedia;

    const result = {
      success: true,
      provider: 'mock-kyc',
      inquiryId: inquiry.inquiryId,
      status: isPassed ? 'passed' : 'review_required',
      decision: {
        approved: isPassed,
        requiresManualReview: pepCheck.isPEP || mediaCheck.hasAdverseMedia,
        reasons: []
      },
      checks: {
        identity: inquiry,
        pep: pepCheck,
        adverseMedia: mediaCheck
      },
      extractedData: inquiry.details?.extractedData || null,
      completedAt: new Date().toISOString()
    };

    // Add reasons if not passed
    if (!isPassed) {
      if (pepCheck.isPEP) result.decision.reasons.push('PEP status detected');
      if (mediaCheck.hasAdverseMedia) result.decision.reasons.push('Adverse media found');
      if (inquiry.status !== 'completed') result.decision.reasons.push(inquiry.reason);
    }

    console.log(`✅ Mock KYC completed: ${result.status}`);
    return result;

  } catch (error) {
    console.error('Mock KYC error:', error);
    return {
      success: false,
      provider: 'mock-kyc',
      status: 'error',
      reason: error.message
    };
  }
}

/**
 * Get provider configuration
 * @returns {object} Provider config
 */
function getProviderConfig() {
  return {
    name: 'Mock KYC Provider',
    version: '1.0.0',
    capabilities: [
      'identity_verification',
      'document_verification',
      'liveness_detection',
      'face_matching',
      'pep_screening',
      'adverse_media_check'
    ],
    supportedDocuments: [
      'passport',
      'drivers_license',
      'national_id',
      'residence_permit'
    ],
    supportedCountries: ['*'], // All countries in mock mode
    processingTime: '1-5 seconds',
    pricing: 'Free (mock mode)'
  };
}

/**
 * Helper function to simulate async delay
 * @param {number} ms - Milliseconds to sleep
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = {
  createInquiry,
  getInquiryStatus,
  verifyDocument,
  performLivenessCheck,
  matchFaceToDocument,
  checkPEPStatus,
  checkAdverseMedia,
  performFullKYC,
  getProviderConfig
};


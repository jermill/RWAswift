/**
 * Risk Scoring Engine
 * Analyzes verification data and calculates risk scores
 */

const config = require('../config');

// Country risk classifications (ISO 3166-1 alpha-3)
const COUNTRY_RISK_LEVELS = {
  // Low Risk Countries
  low: [
    'USA', 'GBR', 'CAN', 'AUS', 'NZL', 'DEU', 'FRA', 'ITA', 'ESP', 'NLD',
    'BEL', 'CHE', 'AUT', 'SWE', 'NOR', 'DNK', 'FIN', 'IRL', 'ISL', 'LUX',
    'SGP', 'JPN', 'KOR', 'HKG', 'TWN'
  ],
  // Medium Risk Countries
  medium: [
    'MEX', 'BRA', 'ARG', 'CHL', 'COL', 'PER', 'THA', 'MYS', 'IDN', 'PHL',
    'IND', 'CHN', 'ZAF', 'TUR', 'POL', 'CZE', 'HUN', 'ROU', 'BGR', 'HRV',
    'SVN', 'SVK', 'EST', 'LVA', 'LTU', 'GRC', 'PRT', 'CYP', 'MLT'
  ],
  // High Risk Countries (FATF monitoring, sanctions, etc.)
  high: [
    'IRN', 'PRK', 'SYR', 'VEN', 'MMR', 'AFG', 'YEM', 'LBY', 'SOM', 'SDN',
    'CUB', 'BLR', 'ZWE', 'RUS' // Note: Risk levels may change based on current sanctions
  ]
};

// Free email domains (higher risk for fraud)
const FREE_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'aol.com',
  'icloud.com', 'mail.com', 'protonmail.com', 'zoho.com', 'yandex.com',
  'gmx.com', 'mail.ru'
];

// Risk factor weights (total should be 100)
const RISK_WEIGHTS = {
  country: 30,        // Country risk level
  emailDomain: 20,    // Email domain type
  velocity: 25,       // Multiple attempts
  sanctions: 25       // Mock sanctions check
};

/**
 * Calculate comprehensive risk score
 * @param {object} verificationData - Verification data
 * @param {object} options - Additional options
 * @returns {object} Risk assessment result
 */
function calculateRiskScore(verificationData, options = {}) {
  const {
    investorEmail,
    investorCountry,
    investorIpAddress,
    // For velocity checking
    recentVerifications = []
  } = verificationData;

  const riskFactors = [];
  let totalScore = 0;

  // 1. Country Risk Assessment (30 points)
  const countryRisk = assessCountryRisk(investorCountry);
  totalScore += countryRisk.score;
  if (countryRisk.reason) {
    riskFactors.push(countryRisk.reason);
  }

  // 2. Email Domain Risk (20 points)
  const emailRisk = assessEmailRisk(investorEmail);
  totalScore += emailRisk.score;
  if (emailRisk.reason) {
    riskFactors.push(emailRisk.reason);
  }

  // 3. Velocity Check (25 points)
  const velocityRisk = assessVelocityRisk(investorEmail, recentVerifications);
  totalScore += velocityRisk.score;
  if (velocityRisk.reason) {
    riskFactors.push(velocityRisk.reason);
  }

  // 4. Mock Sanctions Check (25 points)
  const sanctionsRisk = mockSanctionsCheck(investorEmail, investorCountry);
  totalScore += sanctionsRisk.score;
  if (sanctionsRisk.reason) {
    riskFactors.push(sanctionsRisk.reason);
  }

  // Determine overall risk level
  let riskLevel;
  if (totalScore < 30) riskLevel = 'low';
  else if (totalScore < 70) riskLevel = 'medium';
  else riskLevel = 'high';

  // Determine if should auto-approve
  const autoApprovalThreshold = 70; // Scores below 70 can auto-approve
  const shouldApprove = totalScore < autoApprovalThreshold;

  return {
    score: totalScore,
    level: riskLevel,
    factors: riskFactors,
    shouldApprove,
    breakdown: {
      country: countryRisk,
      email: emailRisk,
      velocity: velocityRisk,
      sanctions: sanctionsRisk
    }
  };
}

/**
 * Assess country risk
 * @param {string} countryCode - ISO 3166-1 alpha-3 country code
 * @returns {object} Country risk assessment
 */
function assessCountryRisk(countryCode) {
  if (!countryCode) {
    return {
      score: 15, // Medium penalty for missing country
      level: 'medium',
      reason: 'Country not provided'
    };
  }

  const country = countryCode.toUpperCase();

  // Check high risk countries
  if (COUNTRY_RISK_LEVELS.high.includes(country)) {
    return {
      score: 30,
      level: 'high',
      reason: `High-risk jurisdiction: ${country}`,
      flagged: true
    };
  }

  // Check medium risk countries
  if (COUNTRY_RISK_LEVELS.medium.includes(country)) {
    return {
      score: 15,
      level: 'medium',
      reason: null
    };
  }

  // Low risk or unknown (treat unknown as low risk)
  return {
    score: 0,
    level: 'low',
    reason: null
  };
}

/**
 * Assess email risk based on domain
 * @param {string} email - Email address
 * @returns {object} Email risk assessment
 */
function assessEmailRisk(email) {
  if (!email) {
    return {
      score: 10,
      reason: 'Email not provided'
    };
  }

  const domain = email.split('@')[1]?.toLowerCase();
  
  if (!domain) {
    return {
      score: 20,
      reason: 'Invalid email format'
    };
  }

  // Check if free email provider
  if (FREE_EMAIL_DOMAINS.includes(domain)) {
    return {
      score: 10, // Moderate penalty for free email
      reason: 'Free email domain',
      isFreeEmail: true
    };
  }

  // Corporate/custom domain (lower risk)
  return {
    score: 0,
    reason: null,
    isFreeEmail: false
  };
}

/**
 * Assess velocity risk (multiple attempts)
 * @param {string} email - Email address
 * @param {array} recentVerifications - Recent verifications
 * @returns {object} Velocity risk assessment
 */
function assessVelocityRisk(email, recentVerifications = []) {
  if (!email) {
    return { score: 0, reason: null };
  }

  // Count verifications from same email in last 24 hours
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentAttempts = recentVerifications.filter(v => {
    if (!v.investorEmail || !v.createdAt) return false;
    return v.investorEmail.toLowerCase() === email.toLowerCase() &&
           new Date(v.createdAt) > oneDayAgo;
  });

  const attemptCount = recentAttempts.length;

  if (attemptCount >= 5) {
    return {
      score: 25,
      reason: `Multiple verification attempts (${attemptCount} in 24h)`,
      attemptCount,
      flagged: true
    };
  }

  if (attemptCount >= 3) {
    return {
      score: 15,
      reason: `Repeated verification attempts (${attemptCount} in 24h)`,
      attemptCount
    };
  }

  if (attemptCount >= 2) {
    return {
      score: 5,
      reason: null,
      attemptCount
    };
  }

  return {
    score: 0,
    reason: null,
    attemptCount
  };
}

/**
 * Mock sanctions check (OFAC, EU, UN lists)
 * In production, this would call real sanctions screening APIs
 * @param {string} email - Email address
 * @param {string} countryCode - Country code
 * @returns {object} Sanctions check result
 */
function mockSanctionsCheck(email, countryCode) {
  // For MVP, use deterministic mock based on email hash
  // In production, replace with real OFAC/sanctions API
  
  if (!email) {
    return { score: 0, reason: null, match: false };
  }

  // Simulate sanctions match for specific patterns (for testing)
  const suspiciousPatterns = ['suspicious', 'blocked', 'sanctioned', 'prohibited'];
  const emailLower = email.toLowerCase();
  
  for (const pattern of suspiciousPatterns) {
    if (emailLower.includes(pattern)) {
      return {
        score: 25,
        reason: 'Sanctions screening flagged',
        match: true,
        flagged: true
      };
    }
  }

  // Random sanctions check (1% failure rate for testing)
  const randomCheck = Math.random();
  if (randomCheck < 0.01) {
    return {
      score: 25,
      reason: 'Sanctions screening requires manual review',
      match: true,
      flagged: true
    };
  }

  // Clear sanctions check
  return {
    score: 0,
    reason: null,
    match: false
  };
}

/**
 * Get country risk level
 * @param {string} countryCode - ISO 3166-1 alpha-3 country code
 * @returns {string} Risk level (low, medium, high)
 */
function getCountryRiskLevel(countryCode) {
  if (!countryCode) return 'medium';
  
  const country = countryCode.toUpperCase();
  
  if (COUNTRY_RISK_LEVELS.high.includes(country)) return 'high';
  if (COUNTRY_RISK_LEVELS.medium.includes(country)) return 'medium';
  return 'low';
}

/**
 * Check if email is free provider
 * @param {string} email - Email address
 * @returns {boolean} True if free email
 */
function isFreeEmailDomain(email) {
  if (!email) return false;
  const domain = email.split('@')[1]?.toLowerCase();
  return domain ? FREE_EMAIL_DOMAINS.includes(domain) : false;
}

/**
 * Get recommended action based on risk score
 * @param {number} riskScore - Risk score (0-100)
 * @returns {string} Recommended action
 */
function getRecommendedAction(riskScore) {
  if (riskScore < 30) return 'auto_approve';
  if (riskScore < 50) return 'approve_with_monitoring';
  if (riskScore < 70) return 'manual_review';
  return 'reject';
}

module.exports = {
  calculateRiskScore,
  assessCountryRisk,
  assessEmailRisk,
  assessVelocityRisk,
  mockSanctionsCheck,
  getCountryRiskLevel,
  isFreeEmailDomain,
  getRecommendedAction,
  // Export constants for testing
  COUNTRY_RISK_LEVELS,
  FREE_EMAIL_DOMAINS,
  RISK_WEIGHTS
};


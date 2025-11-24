/**
 * Authentication Middleware
 * JWT validation and API key authentication
 */

const { verifyToken } = require('../utils/crypto');
const config = require('../config');
const db = require('../config/supabase');

/**
 * Find organization by API key
 * @param {string} apiKey - API key to look up
 * @returns {object|null} Organization object or null
 */
async function findOrganizationByApiKey(apiKey) {
  try {
    const organization = await db.organizations.findByApiKey(apiKey);
    return organization;
  } catch (error) {
    console.error('Error finding organization by API key:', error);
    return null;
  }
}

/**
 * JWT Authentication Middleware
 * Validates JWT token from Authorization header
 */
const authenticateJWT = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: {
          message: 'Missing or invalid authorization header',
          code: 'MISSING_AUTH_HEADER'
        }
      });
    }
    
    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Verify token
    const decoded = verifyToken(token);
    
    // Attach organization info to request
    req.org = {
      id: decoded.orgId,
      email: decoded.email,
      plan: decoded.plan
    };
    
    req.userId = decoded.userId;
    
    next();
  } catch (error) {
    return res.status(401).json({
      error: {
        message: 'Invalid or expired token',
        code: 'INVALID_TOKEN',
        details: config.isDevelopment ? error.message : undefined
      }
    });
  }
};

/**
 * API Key Authentication Middleware
 * Validates API key from Authorization header or query parameter
 */
const authenticateApiKey = async (req, res, next) => {
  try {
    // Get API key from header or query parameter
    let apiKey = req.headers['x-api-key'] || req.query.api_key;
    
    // Also support Authorization: Bearer <api-key>
    if (!apiKey && req.headers.authorization) {
      const authHeader = req.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7);
      }
    }
    
    if (!apiKey) {
      return res.status(401).json({
        error: {
          message: 'API key is required',
          code: 'MISSING_API_KEY',
          hint: 'Provide API key in X-API-Key header or api_key query parameter'
        }
      });
    }
    
    // Validate API key format
    if (!apiKey.startsWith(config.security.apiKeyPrefix)) {
      return res.status(401).json({
        error: {
          message: 'Invalid API key format',
          code: 'INVALID_API_KEY_FORMAT'
        }
      });
    }
    
    // Look up organization by API key
    const organization = await findOrganizationByApiKey(apiKey);
    
    if (!organization) {
      return res.status(401).json({
        error: {
          message: 'Invalid API key',
          code: 'INVALID_API_KEY'
        }
      });
    }
    
    // Check organization status
    if (organization.status !== 'active') {
      return res.status(403).json({
        error: {
          message: 'Organization account is not active',
          code: 'INACTIVE_ACCOUNT',
          status: organization.status
        }
      });
    }
    
    // Check usage limits
    if (organization.monthly_usage >= organization.monthly_limit) {
      return res.status(429).json({
        error: {
          message: 'Monthly usage limit exceeded',
          code: 'USAGE_LIMIT_EXCEEDED',
          limit: organization.monthly_limit,
          usage: organization.monthly_usage
        }
      });
    }
    
    // Attach organization to request
    req.org = organization;
    req.apiKey = apiKey;
    
    // TODO: Update last_api_call_at in database
    // TODO: Increment usage counter
    
    next();
  } catch (error) {
    console.error('API key authentication error:', error);
    return res.status(500).json({
      error: {
        message: 'Authentication failed',
        code: 'AUTH_ERROR',
        details: config.isDevelopment ? error.message : undefined
      }
    });
  }
};

/**
 * Optional Authentication Middleware
 * Tries to authenticate but doesn't fail if no auth provided
 */
const optionalAuth = async (req, res, next) => {
  try {
    // Try API key first
    if (req.headers['x-api-key'] || req.query.api_key) {
      return authenticateApiKey(req, res, next);
    }
    
    // Try JWT
    if (req.headers.authorization) {
      return authenticateJWT(req, res, next);
    }
    
    // No authentication provided, continue without org
    req.org = null;
    next();
  } catch (error) {
    // Ignore errors in optional auth
    req.org = null;
    next();
  }
};

/**
 * Check if organization has specific plan
 * @param {string[]} allowedPlans - Array of allowed plan names
 */
const requirePlan = (allowedPlans) => {
  return (req, res, next) => {
    if (!req.org) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
          code: 'AUTH_REQUIRED'
        }
      });
    }
    
    if (!allowedPlans.includes(req.org.plan)) {
      return res.status(403).json({
        error: {
          message: 'This feature requires a higher plan',
          code: 'PLAN_REQUIRED',
          currentPlan: req.org.plan,
          requiredPlans: allowedPlans
        }
      });
    }
    
    next();
  };
};

module.exports = {
  authenticateJWT,
  authenticateApiKey,
  optionalAuth,
  requirePlan
};


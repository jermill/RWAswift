/**
 * Authentication Controller
 * Handles organization registration, login, and token management
 */

const { 
  hashPassword, 
  comparePassword, 
  generateApiKey, 
  generateApiSecret, 
  hashApiSecret,
  getApiKeyPrefix,
  signToken,
  signRefreshToken,
  verifyRefreshToken
} = require('../utils/crypto');
const config = require('../config');
const { sendWelcomeEmail, sendApiKeyRotated } = require('../services/emailService');

// Mock database (will be replaced with real DB)
const mockDatabase = {
  organizations: []
};

/**
 * Register new organization
 * POST /api/v1/auth/register
 */
exports.register = async (req, res) => {
  try {
    const { name, email, password, website } = req.body;
    
    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        error: {
          message: 'Name, email, and password are required',
          code: 'VALIDATION_ERROR'
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
    
    // Password validation
    if (password.length < 8) {
      return res.status(400).json({
        error: {
          message: 'Password must be at least 8 characters',
          code: 'WEAK_PASSWORD'
        }
      });
    }
    
    // Check if organization already exists
    // TODO: Replace with database query
    const existingOrg = mockDatabase.organizations.find(org => org.email === email);
    if (existingOrg) {
      return res.status(409).json({
        error: {
          message: 'Organization with this email already exists',
          code: 'DUPLICATE_EMAIL'
        }
      });
    }
    
    // Generate API credentials
    const apiKey = generateApiKey(config.security.apiKeyPrefix);
    const apiSecret = generateApiSecret();
    const apiSecretHash = await hashApiSecret(apiSecret);
    const apiKeyPrefix = getApiKeyPrefix(apiKey);
    
    // Hash password
    const passwordHash = await hashPassword(password);
    
    // Create organization
    const organization = {
      id: require('crypto').randomUUID(),
      name,
      email: email.toLowerCase(),
      website,
      passwordHash,
      apiKey,
      apiKeyPrefix,
      apiSecretHash,
      plan: 'starter',
      monthlyLimit: 100,
      monthlyUsage: 0,
      status: 'active',
      isVerified: false,
      createdAt: new Date().toISOString()
    };
    
    // TODO: Save to database
    mockDatabase.organizations.push(organization);
    
    // Send welcome email (non-blocking)
    sendWelcomeEmail(email, organization, apiKey).catch(err =>
      console.error('Welcome email error:', err)
    );
    
    // Generate tokens
    const accessToken = signToken({
      orgId: organization.id,
      email: organization.email,
      plan: organization.plan
    });
    
    const refreshToken = signRefreshToken({
      orgId: organization.id
    });
    
    // Return response (hide sensitive data)
    res.status(201).json({
      message: 'Organization registered successfully',
      organization: {
        id: organization.id,
        name: organization.name,
        email: organization.email,
        website: organization.website,
        plan: organization.plan,
        status: organization.status
      },
      apiKey,
      apiSecret, // Only shown once during registration
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: config.auth.jwtExpiresIn
      },
      next_steps: [
        'Save your API key and secret in a secure location',
        'API secret will not be shown again',
        'Use API key to authenticate verification requests',
        'Access dashboard at /dashboard'
      ]
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      error: {
        message: 'Registration failed',
        code: 'REGISTRATION_ERROR',
        details: config.isDevelopment ? error.message : undefined
      }
    });
  }
};

/**
 * Login to get access tokens
 * POST /api/v1/auth/login
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Validation
    if (!email || !password) {
      return res.status(400).json({
        error: {
          message: 'Email and password are required',
          code: 'VALIDATION_ERROR'
        }
      });
    }
    
    // Find organization
    // TODO: Replace with database query
    const organization = mockDatabase.organizations.find(
      org => org.email === email.toLowerCase()
    );
    
    if (!organization) {
      return res.status(401).json({
        error: {
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        }
      });
    }
    
    // Verify password
    const isValidPassword = await comparePassword(password, organization.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({
        error: {
          message: 'Invalid email or password',
          code: 'INVALID_CREDENTIALS'
        }
      });
    }
    
    // Check account status
    if (organization.status !== 'active') {
      return res.status(403).json({
        error: {
          message: 'Account is not active',
          code: 'INACTIVE_ACCOUNT',
          status: organization.status
        }
      });
    }
    
    // Generate tokens
    const accessToken = signToken({
      orgId: organization.id,
      email: organization.email,
      plan: organization.plan
    });
    
    const refreshToken = signRefreshToken({
      orgId: organization.id
    });
    
    // TODO: Update last_login_at in database
    
    res.json({
      message: 'Login successful',
      organization: {
        id: organization.id,
        name: organization.name,
        email: organization.email,
        plan: organization.plan,
        apiKeyPrefix: organization.apiKeyPrefix
      },
      tokens: {
        accessToken,
        refreshToken,
        expiresIn: config.auth.jwtExpiresIn
      }
    });
    
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: {
        message: 'Login failed',
        code: 'LOGIN_ERROR',
        details: config.isDevelopment ? error.message : undefined
      }
    });
  }
};

/**
 * Refresh access token
 * POST /api/v1/auth/refresh
 */
exports.refresh = async (req, res) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      return res.status(400).json({
        error: {
          message: 'Refresh token is required',
          code: 'MISSING_REFRESH_TOKEN'
        }
      });
    }
    
    // Verify refresh token
    let decoded;
    try {
      decoded = verifyRefreshToken(refreshToken);
    } catch (error) {
      return res.status(401).json({
        error: {
          message: 'Invalid or expired refresh token',
          code: 'INVALID_REFRESH_TOKEN'
        }
      });
    }
    
    // Find organization
    // TODO: Replace with database query
    const organization = mockDatabase.organizations.find(
      org => org.id === decoded.orgId
    );
    
    if (!organization) {
      return res.status(401).json({
        error: {
          message: 'Organization not found',
          code: 'ORG_NOT_FOUND'
        }
      });
    }
    
    // Check account status
    if (organization.status !== 'active') {
      return res.status(403).json({
        error: {
          message: 'Account is not active',
          code: 'INACTIVE_ACCOUNT'
        }
      });
    }
    
    // Generate new access token
    const accessToken = signToken({
      orgId: organization.id,
      email: organization.email,
      plan: organization.plan
    });
    
    // Optionally rotate refresh token
    const newRefreshToken = signRefreshToken({
      orgId: organization.id
    });
    
    res.json({
      message: 'Token refreshed successfully',
      tokens: {
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: config.auth.jwtExpiresIn
      }
    });
    
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({
      error: {
        message: 'Token refresh failed',
        code: 'REFRESH_ERROR',
        details: config.isDevelopment ? error.message : undefined
      }
    });
  }
};

/**
 * Get current organization info
 * GET /api/v1/auth/me
 */
exports.getMe = async (req, res) => {
  try {
    // Organization is already attached by JWT middleware
    const { org } = req;
    
    // Get full organization details
    // TODO: Replace with database query
    const organization = mockDatabase.organizations.find(
      o => o.id === org.id
    );
    
    if (!organization) {
      return res.status(404).json({
        error: {
          message: 'Organization not found',
          code: 'ORG_NOT_FOUND'
        }
      });
    }
    
    res.json({
      organization: {
        id: organization.id,
        name: organization.name,
        email: organization.email,
        website: organization.website,
        plan: organization.plan,
        status: organization.status,
        isVerified: organization.isVerified,
        apiKeyPrefix: organization.apiKeyPrefix,
        usage: {
          monthly: organization.monthlyUsage,
          limit: organization.monthlyLimit,
          percentage: Math.round((organization.monthlyUsage / organization.monthlyLimit) * 100)
        },
        createdAt: organization.createdAt
      }
    });
    
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get organization info',
        code: 'GET_ME_ERROR',
        details: config.isDevelopment ? error.message : undefined
      }
    });
  }
};

/**
 * Rotate API key
 * POST /api/v1/auth/rotate-key
 */
exports.rotateApiKey = async (req, res) => {
  try {
    const { org } = req;
    
    // Generate new API credentials
    const newApiKey = generateApiKey(config.security.apiKeyPrefix);
    const newApiSecret = generateApiSecret();
    const newApiSecretHash = await hashApiSecret(newApiSecret);
    const newApiKeyPrefix = getApiKeyPrefix(newApiKey);
    
    // TODO: Update database with new credentials
    const organization = mockDatabase.organizations.find(o => o.id === org.id);
    if (organization) {
      organization.apiKey = newApiKey;
      organization.apiKeyPrefix = newApiKeyPrefix;
      organization.apiSecretHash = newApiSecretHash;
      
      // Send rotation notification email (non-blocking)
      sendApiKeyRotated(organization.email, newApiKeyPrefix).catch(err =>
        console.error('API key rotation email error:', err)
      );
    }
    
    res.json({
      message: 'API key rotated successfully',
      apiKey: newApiKey,
      apiSecret: newApiSecret,
      warning: 'Update your applications with the new API key. The old key has been deactivated.'
    });
    
  } catch (error) {
    console.error('API key rotation error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to rotate API key',
        code: 'ROTATION_ERROR',
        details: config.isDevelopment ? error.message : undefined
      }
    });
  }
};


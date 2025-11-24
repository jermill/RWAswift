/**
 * Configuration Loader and Validator
 * Loads and validates all environment variables
 */

require('dotenv').config();

/**
 * Required environment variables
 */
const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET'
];

/**
 * Optional environment variables with defaults
 */
const optionalEnvVars = {
  FRONTEND_URL: 'http://localhost:3000',
  JWT_EXPIRES_IN: '15m',
  JWT_REFRESH_EXPIRES_IN: '7d',
  LOG_LEVEL: 'info',
  RATE_LIMIT_WINDOW: '15m',
  RATE_LIMIT_MAX_REQUESTS: '100',
  ALLOWED_ORIGINS: 'http://localhost:3000,http://localhost:3001',
  ENABLE_WEBHOOKS: 'true',
  ENABLE_EMAIL_NOTIFICATIONS: 'true',
  ENABLE_MOCK_KYC: 'true',
  AUTO_APPROVAL_RATE: '0.95'
};

/**
 * Validate environment variables
 * @throws {Error} if required variables are missing
 */
function validateEnv() {
  const missing = [];
  
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  }
  
  if (missing.length > 0) {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}

/**
 * Get configuration value with default fallback
 * @param {string} key - Environment variable name
 * @param {*} defaultValue - Default value if not set
 * @returns {*} Configuration value
 */
function get(key, defaultValue = null) {
  return process.env[key] || optionalEnvVars[key] || defaultValue;
}

/**
 * Get boolean configuration value
 * @param {string} key - Environment variable name
 * @param {boolean} defaultValue - Default value if not set
 * @returns {boolean} Configuration value
 */
function getBoolean(key, defaultValue = false) {
  const value = get(key);
  if (value === null || value === undefined) return defaultValue;
  return value === 'true' || value === '1' || value === 'yes';
}

/**
 * Get number configuration value
 * @param {string} key - Environment variable name
 * @param {number} defaultValue - Default value if not set
 * @returns {number} Configuration value
 */
function getNumber(key, defaultValue = 0) {
  const value = get(key);
  if (value === null || value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

/**
 * Get float configuration value
 * @param {string} key - Environment variable name
 * @param {number} defaultValue - Default value if not set
 * @returns {number} Configuration value
 */
function getFloat(key, defaultValue = 0.0) {
  const value = get(key);
  if (value === null || value === undefined) return defaultValue;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? defaultValue : parsed;
}

// Validate environment on load
if (process.env.NODE_ENV !== 'test') {
  try {
    validateEnv();
    console.log('✅ Environment variables validated');
  } catch (error) {
    console.error('❌ Environment validation failed:', error.message);
    process.exit(1);
  }
}

/**
 * Exported configuration object
 */
const config = {
  // Application
  env: process.env.NODE_ENV || 'development',
  port: getNumber('PORT', 3001),
  frontendUrl: get('FRONTEND_URL'),
  isDevelopment: process.env.NODE_ENV === 'development',
  isProduction: process.env.NODE_ENV === 'production',
  isTest: process.env.NODE_ENV === 'test',
  
  // Database
  database: {
    url: get('DATABASE_URL'),
    ssl: process.env.NODE_ENV === 'production'
  },
  
  // Supabase
  supabase: {
    url: get('SUPABASE_URL'),
    anonKey: get('SUPABASE_ANON_KEY'),
    serviceKey: get('SUPABASE_SERVICE_KEY')
  },
  
  // Authentication
  auth: {
    jwtSecret: get('JWT_SECRET'),
    jwtRefreshSecret: get('JWT_REFRESH_SECRET'),
    jwtExpiresIn: get('JWT_EXPIRES_IN'),
    jwtRefreshExpiresIn: get('JWT_REFRESH_EXPIRES_IN')
  },
  
  // External Services
  services: {
    persona: {
      apiKey: get('PERSONA_API_KEY'),
      templateId: get('PERSONA_TEMPLATE_ID'),
      environment: get('PERSONA_ENVIRONMENT', 'sandbox')
    },
    ofac: {
      apiKey: get('OFAC_API_KEY'),
      apiUrl: get('OFAC_API_URL')
    },
    sendgrid: {
      apiKey: get('SENDGRID_API_KEY'),
      fromEmail: get('FROM_EMAIL', 'noreply@rwaswift.com')
    },
    stripe: {
      secretKey: get('STRIPE_SECRET_KEY'),
      webhookSecret: get('STRIPE_WEBHOOK_SECRET')
    }
  },
  
  // Storage
  storage: {
    aws: {
      accessKeyId: get('AWS_ACCESS_KEY_ID'),
      secretAccessKey: get('AWS_SECRET_ACCESS_KEY'),
      region: get('AWS_REGION', 'us-east-1'),
      bucketName: get('S3_BUCKET_NAME')
    }
  },
  
  // Redis
  redis: {
    url: get('REDIS_URL', 'redis://localhost:6379'),
    password: get('REDIS_PASSWORD')
  },
  
  // Security
  security: {
    encryptionKey: get('ENCRYPTION_KEY'),
    apiKeyPrefix: get('API_KEY_PREFIX', 'rwa_'),
    allowedOrigins: get('ALLOWED_ORIGINS', '').split(',').filter(Boolean)
  },
  
  // Rate Limiting
  rateLimit: {
    window: get('RATE_LIMIT_WINDOW'),
    maxRequests: getNumber('RATE_LIMIT_MAX_REQUESTS')
  },
  
  // Monitoring
  monitoring: {
    sentryDsn: get('SENTRY_DSN'),
    datadogApiKey: get('DATADOG_API_KEY'),
    logLevel: get('LOG_LEVEL')
  },
  
  // Feature Flags
  features: {
    webhooksEnabled: getBoolean('ENABLE_WEBHOOKS'),
    emailNotificationsEnabled: getBoolean('ENABLE_EMAIL_NOTIFICATIONS'),
    mockKycEnabled: getBoolean('ENABLE_MOCK_KYC'),
    autoApprovalRate: getFloat('AUTO_APPROVAL_RATE')
  },
  
  // Helper methods
  get,
  getBoolean,
  getNumber,
  getFloat,
  validateEnv
};

module.exports = config;


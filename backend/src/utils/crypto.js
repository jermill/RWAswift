/**
 * Cryptography Utilities
 * Password hashing, API key generation, JWT signing
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * Hash a password using bcrypt
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password) {
  const saltRounds = 10;
  return await bcrypt.hash(password, saltRounds);
}

/**
 * Compare password with hash
 * @param {string} password - Plain text password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} Match result
 */
async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Generate API key
 * @param {string} prefix - API key prefix (e.g., 'rwa_')
 * @returns {string} Generated API key
 */
function generateApiKey(prefix = 'rwa_') {
  const randomBytes = crypto.randomBytes(32).toString('hex');
  return `${prefix}${randomBytes}`;
}

/**
 * Generate API secret
 * @returns {string} Generated API secret
 */
function generateApiSecret() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Hash API secret
 * @param {string} secret - API secret
 * @returns {Promise<string>} Hashed secret
 */
async function hashApiSecret(secret) {
  return await hashPassword(secret);
}

/**
 * Get API key prefix (first 8 characters after prefix)
 * @param {string} apiKey - Full API key
 * @returns {string} API key prefix
 */
function getApiKeyPrefix(apiKey) {
  // Extract prefix like 'rwa_test' from 'rwa_test_sk_1234...'
  const parts = apiKey.split('_');
  return parts.slice(0, 2).join('_');
}

/**
 * Sign JWT token
 * @param {object} payload - Token payload
 * @param {string} expiresIn - Token expiration (e.g., '15m', '7d')
 * @returns {string} Signed JWT token
 */
function signToken(payload, expiresIn = config.auth.jwtExpiresIn) {
  return jwt.sign(payload, config.auth.jwtSecret, {
    expiresIn,
    issuer: 'rwaswift',
    audience: 'rwaswift-api'
  });
}

/**
 * Sign refresh token
 * @param {object} payload - Token payload
 * @returns {string} Signed refresh token
 */
function signRefreshToken(payload) {
  return jwt.sign(payload, config.auth.jwtRefreshSecret, {
    expiresIn: config.auth.jwtRefreshExpiresIn,
    issuer: 'rwaswift',
    audience: 'rwaswift-api'
  });
}

/**
 * Verify JWT token
 * @param {string} token - JWT token
 * @returns {object} Decoded token payload
 * @throws {Error} If token is invalid
 */
function verifyToken(token) {
  try {
    return jwt.verify(token, config.auth.jwtSecret, {
      issuer: 'rwaswift',
      audience: 'rwaswift-api'
    });
  } catch (error) {
    throw new Error(`Invalid token: ${error.message}`);
  }
}

/**
 * Verify refresh token
 * @param {string} token - Refresh token
 * @returns {object} Decoded token payload
 * @throws {Error} If token is invalid
 */
function verifyRefreshToken(token) {
  try {
    return jwt.verify(token, config.auth.jwtRefreshSecret, {
      issuer: 'rwaswift',
      audience: 'rwaswift-api'
    });
  } catch (error) {
    throw new Error(`Invalid refresh token: ${error.message}`);
  }
}

/**
 * Generate random string
 * @param {number} length - Length of string
 * @returns {string} Random string
 */
function generateRandomString(length = 32) {
  return crypto.randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

/**
 * Hash data using SHA256
 * @param {string} data - Data to hash
 * @returns {string} Hashed data
 */
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Generate webhook secret
 * @returns {string} Webhook secret
 */
function generateWebhookSecret() {
  return `whsec_${generateRandomString(32)}`;
}

/**
 * Create HMAC signature
 * @param {string} data - Data to sign
 * @param {string} secret - Secret key
 * @returns {string} HMAC signature
 */
function createHmacSignature(data, secret) {
  return crypto.createHmac('sha256', secret)
    .update(data)
    .digest('hex');
}

/**
 * Verify HMAC signature
 * @param {string} data - Original data
 * @param {string} signature - Signature to verify
 * @param {string} secret - Secret key
 * @returns {boolean} Verification result
 */
function verifyHmacSignature(data, signature, secret) {
  const expectedSignature = createHmacSignature(data, secret);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}

module.exports = {
  hashPassword,
  comparePassword,
  generateApiKey,
  generateApiSecret,
  hashApiSecret,
  getApiKeyPrefix,
  signToken,
  signRefreshToken,
  verifyToken,
  verifyRefreshToken,
  generateRandomString,
  sha256,
  generateWebhookSecret,
  createHmacSignature,
  verifyHmacSignature
};


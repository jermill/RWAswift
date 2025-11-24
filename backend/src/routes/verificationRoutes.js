/**
 * Verification Routes
 * /api/v1/verify
 */

const express = require('express');
const router = express.Router();
const verificationController = require('../controllers/verificationController');
const { authenticateApiKey } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');

// Rate limiter for verification endpoints
const verifyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // Limit each org to 10 verifications per minute
  message: {
    error: {
      message: 'Too many verification requests, please slow down',
      code: 'RATE_LIMIT_EXCEEDED'
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    // Rate limit by organization ID
    return req.org?.id || req.ip;
  }
});

// All verification routes require API key authentication
router.use(authenticateApiKey);

// Routes
router.post('/', verifyLimiter, verificationController.createVerification);
router.get('/stats', verificationController.getStats);
router.get('/:id', verificationController.getVerification);
router.get('/', verificationController.listVerifications);

module.exports = router;


/**
 * API Routes Index
 * Mounts all route modules
 */

const express = require('express');
const router = express.Router();
const authRoutes = require('./authRoutes');
const verificationRoutes = require('./verificationRoutes');
const webhookRoutes = require('./webhookRoutes');

// Mount route modules
router.use('/auth', authRoutes);
router.use('/verify', verificationRoutes);
router.use('/webhooks', webhookRoutes);

// API info endpoint
router.get('/', (req, res) => {
  res.json({
    name: 'RWAswift API',
    version: 'v1',
    description: 'Real World Asset Compliance Platform API',
    documentation: 'https://docs.rwaswift.com',
    endpoints: {
      auth: '/api/v1/auth',
      verify: '/api/v1/verify',
      webhooks: '/api/v1/webhooks',
      stats: '/api/v1/stats'
    },
    status: 'operational'
  });
});

// Stats endpoint (quick access)
router.get('/stats', (req, res) => {
  res.redirect('/api/v1/verify/stats');
});

module.exports = router;


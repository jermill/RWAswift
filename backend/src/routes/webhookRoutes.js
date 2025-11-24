/**
 * Webhook Routes
 * /api/v1/webhooks
 */

const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');
const { authenticateApiKey } = require('../middleware/auth');

// All webhook routes require API key authentication
router.use(authenticateApiKey);

// CRUD routes
router.post('/', webhookController.createWebhook);
router.get('/', webhookController.listWebhooks);
router.get('/:id', webhookController.getWebhook);
router.patch('/:id', webhookController.updateWebhook);
router.delete('/:id', webhookController.deleteWebhook);

// Test and delivery logs
router.post('/:id/test', webhookController.testWebhookDelivery);
router.get('/:id/deliveries', webhookController.getDeliveries);

module.exports = router;


/**
 * Webhook Controller
 * Manages webhook configurations and delivery logs
 */

const crypto = require('crypto');
const config = require('../config');
const { generateWebhookSecret } = require('../utils/crypto');
const { testWebhook, getDeliveryLogs } = require('../services/webhookService');

// Mock database for webhooks
const mockDatabase = {
  webhooks: []
};

/**
 * Create webhook
 * POST /api/v1/webhooks
 */
exports.createWebhook = async (req, res) => {
  try {
    const { org } = req;
    const { url, events, description } = req.body;
    
    // Validation
    if (!url) {
      return res.status(400).json({
        error: {
          message: 'Webhook URL is required',
          code: 'MISSING_URL'
        }
      });
    }
    
    // Validate URL format
    try {
      new URL(url);
    } catch (e) {
      return res.status(400).json({
        error: {
          message: 'Invalid webhook URL format',
          code: 'INVALID_URL'
        }
      });
    }
    
    // Validate events
    const validEvents = [
      'verification.completed',
      'verification.approved',
      'verification.rejected',
      'verification.failed'
    ];
    
    const webhookEvents = events || ['verification.completed'];
    const invalidEvents = webhookEvents.filter(e => !validEvents.includes(e));
    
    if (invalidEvents.length > 0) {
      return res.status(400).json({
        error: {
          message: 'Invalid event types',
          code: 'INVALID_EVENTS',
          invalidEvents,
          validEvents
        }
      });
    }
    
    // Generate webhook secret
    const secret = generateWebhookSecret();
    
    // Create webhook
    const webhook = {
      id: crypto.randomUUID(),
      orgId: org.id,
      url,
      secret,
      events: webhookEvents,
      isActive: true,
      retryCount: 3,
      timeoutSeconds: 10,
      description: description || null,
      metadata: req.body.metadata || {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lastTriggeredAt: null
    };
    
    // Store webhook
    mockDatabase.webhooks.push(webhook);
    
    res.status(201).json({
      message: 'Webhook created successfully',
      webhook: {
        id: webhook.id,
        url: webhook.url,
        secret: webhook.secret, // Only shown once
        events: webhook.events,
        isActive: webhook.isActive,
        retryCount: webhook.retryCount,
        timeoutSeconds: webhook.timeoutSeconds,
        description: webhook.description,
        createdAt: webhook.createdAt
      },
      important: [
        'Save the webhook secret securely',
        'Use the secret to verify webhook signatures',
        'The secret will not be shown again'
      ]
    });
    
  } catch (error) {
    console.error('Create webhook error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to create webhook',
        code: 'CREATE_ERROR',
        details: config.isDevelopment ? error.message : undefined
      }
    });
  }
};

/**
 * List webhooks
 * GET /api/v1/webhooks
 */
exports.listWebhooks = async (req, res) => {
  try {
    const { org } = req;
    
    // Get org webhooks
    const webhooks = mockDatabase.webhooks.filter(w => w.orgId === org.id);
    
    // Format response (hide secrets)
    const formattedWebhooks = webhooks.map(w => ({
      id: w.id,
      url: w.url,
      events: w.events,
      isActive: w.isActive,
      retryCount: w.retryCount,
      timeoutSeconds: w.timeoutSeconds,
      description: w.description,
      lastTriggeredAt: w.lastTriggeredAt,
      createdAt: w.createdAt
    }));
    
    res.json({
      webhooks: formattedWebhooks,
      total: formattedWebhooks.length
    });
    
  } catch (error) {
    console.error('List webhooks error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to list webhooks',
        code: 'LIST_ERROR',
        details: config.isDevelopment ? error.message : undefined
      }
    });
  }
};

/**
 * Get webhook by ID
 * GET /api/v1/webhooks/:id
 */
exports.getWebhook = async (req, res) => {
  try {
    const { org } = req;
    const { id } = req.params;
    
    // Find webhook
    const webhook = mockDatabase.webhooks.find(
      w => w.id === id && w.orgId === org.id
    );
    
    if (!webhook) {
      return res.status(404).json({
        error: {
          message: 'Webhook not found',
          code: 'NOT_FOUND'
        }
      });
    }
    
    res.json({
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        retryCount: webhook.retryCount,
        timeoutSeconds: webhook.timeoutSeconds,
        description: webhook.description,
        lastTriggeredAt: webhook.lastTriggeredAt,
        createdAt: webhook.createdAt,
        updatedAt: webhook.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Get webhook error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get webhook',
        code: 'GET_ERROR',
        details: config.isDevelopment ? error.message : undefined
      }
    });
  }
};

/**
 * Update webhook
 * PATCH /api/v1/webhooks/:id
 */
exports.updateWebhook = async (req, res) => {
  try {
    const { org } = req;
    const { id } = req.params;
    const { url, events, isActive, description } = req.body;
    
    // Find webhook
    const webhook = mockDatabase.webhooks.find(
      w => w.id === id && w.orgId === org.id
    );
    
    if (!webhook) {
      return res.status(404).json({
        error: {
          message: 'Webhook not found',
          code: 'NOT_FOUND'
        }
      });
    }
    
    // Update fields
    if (url !== undefined) webhook.url = url;
    if (events !== undefined) webhook.events = events;
    if (isActive !== undefined) webhook.isActive = isActive;
    if (description !== undefined) webhook.description = description;
    
    webhook.updatedAt = new Date().toISOString();
    
    res.json({
      message: 'Webhook updated successfully',
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.isActive,
        description: webhook.description,
        updatedAt: webhook.updatedAt
      }
    });
    
  } catch (error) {
    console.error('Update webhook error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to update webhook',
        code: 'UPDATE_ERROR',
        details: config.isDevelopment ? error.message : undefined
      }
    });
  }
};

/**
 * Delete webhook
 * DELETE /api/v1/webhooks/:id
 */
exports.deleteWebhook = async (req, res) => {
  try {
    const { org } = req;
    const { id } = req.params;
    
    // Find webhook index
    const index = mockDatabase.webhooks.findIndex(
      w => w.id === id && w.orgId === org.id
    );
    
    if (index === -1) {
      return res.status(404).json({
        error: {
          message: 'Webhook not found',
          code: 'NOT_FOUND'
        }
      });
    }
    
    // Remove webhook
    mockDatabase.webhooks.splice(index, 1);
    
    res.json({
      message: 'Webhook deleted successfully'
    });
    
  } catch (error) {
    console.error('Delete webhook error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to delete webhook',
        code: 'DELETE_ERROR',
        details: config.isDevelopment ? error.message : undefined
      }
    });
  }
};

/**
 * Test webhook
 * POST /api/v1/webhooks/:id/test
 */
exports.testWebhookDelivery = async (req, res) => {
  try {
    const { org } = req;
    const { id } = req.params;
    
    // Find webhook
    const webhook = mockDatabase.webhooks.find(
      w => w.id === id && w.orgId === org.id
    );
    
    if (!webhook) {
      return res.status(404).json({
        error: {
          message: 'Webhook not found',
          code: 'NOT_FOUND'
        }
      });
    }
    
    // Test delivery
    const result = await testWebhook(webhook);
    
    if (result.success) {
      res.json({
        message: 'Test webhook delivered successfully',
        delivery: {
          deliveryId: result.deliveryId,
          httpStatus: result.httpStatus,
          responseTime: result.responseTime
        }
      });
    } else {
      res.status(500).json({
        error: {
          message: 'Test webhook delivery failed',
          code: 'DELIVERY_FAILED',
          httpStatus: result.httpStatus,
          errorMessage: result.errorMessage
        }
      });
    }
    
  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to test webhook',
        code: 'TEST_ERROR',
        details: config.isDevelopment ? error.message : undefined
      }
    });
  }
};

/**
 * Get webhook delivery logs
 * GET /api/v1/webhooks/:id/deliveries
 */
exports.getDeliveries = async (req, res) => {
  try {
    const { org } = req;
    const { id } = req.params;
    const { limit = 50, offset = 0 } = req.query;
    
    // Find webhook
    const webhook = mockDatabase.webhooks.find(
      w => w.id === id && w.orgId === org.id
    );
    
    if (!webhook) {
      return res.status(404).json({
        error: {
          message: 'Webhook not found',
          code: 'NOT_FOUND'
        }
      });
    }
    
    // Get delivery logs
    const deliveries = getDeliveryLogs(id, { limit, offset });
    
    res.json({
      deliveries,
      total: deliveries.length
    });
    
  } catch (error) {
    console.error('Get deliveries error:', error);
    res.status(500).json({
      error: {
        message: 'Failed to get delivery logs',
        code: 'GET_DELIVERIES_ERROR',
        details: config.isDevelopment ? error.message : undefined
      }
    });
  }
};

// Export mock database for integration with webhook service
exports._mockDatabase = mockDatabase;


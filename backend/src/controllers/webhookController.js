/**
 * Webhook Controller
 * Manages webhook configurations and delivery logs
 */

const crypto = require('crypto');
const config = require('../config');
const { generateWebhookSecret } = require('../utils/crypto');
const { testWebhook, getDeliveryLogs } = require('../services/webhookService');
const db = require('../config/supabase');

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
    
    // Create webhook in database
    const webhook = await db.webhooks.create({
      organization_id: org.id,
      url,
      secret,
      events: webhookEvents,
      is_active: true,
      description: description || null
    });
    
    res.status(201).json({
      message: 'Webhook created successfully',
      webhook: {
        id: webhook.id,
        url: webhook.url,
        secret: webhook.secret, // Only shown once
        events: webhook.events,
        isActive: webhook.is_active,
        retryCount: webhook.retry_count,
        timeoutSeconds: webhook.timeout_seconds,
        description: webhook.description,
        createdAt: webhook.created_at
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
    
    // Get org webhooks from database
    const webhooks = await db.webhooks.findByOrganization(org.id);
    
    // Format response (hide secrets)
    const formattedWebhooks = webhooks.map(w => ({
      id: w.id,
      url: w.url,
      events: w.events,
      isActive: w.is_active,
      retryCount: w.retry_count,
      timeoutSeconds: w.timeout_seconds,
      description: w.description,
      lastTriggeredAt: w.last_triggered_at,
      createdAt: w.created_at
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
    const webhook = await db.webhooks.findById(id, org.id);
    
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
        isActive: webhook.is_active,
        retryCount: webhook.retry_count,
        timeoutSeconds: webhook.timeout_seconds,
        description: webhook.description,
        lastTriggeredAt: webhook.last_triggered_at,
        createdAt: webhook.created_at,
        updatedAt: webhook.updated_at
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
    
    // Prepare update data
    const updateData = {};
    if (url !== undefined) updateData.url = url;
    if (events !== undefined) updateData.events = events;
    if (isActive !== undefined) updateData.is_active = isActive;
    if (description !== undefined) updateData.description = description;
    
    // Update webhook in database
    const webhook = await db.webhooks.update(id, org.id, updateData);
    
    if (!webhook) {
      return res.status(404).json({
        error: {
          message: 'Webhook not found',
          code: 'NOT_FOUND'
        }
      });
    }
    
    res.json({
      message: 'Webhook updated successfully',
      webhook: {
        id: webhook.id,
        url: webhook.url,
        events: webhook.events,
        isActive: webhook.is_active,
        description: webhook.description,
        updatedAt: webhook.updated_at
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
    
    // Delete webhook from database
    const deleted = await db.webhooks.delete(id, org.id);
    
    if (!deleted) {
      return res.status(404).json({
        error: {
          message: 'Webhook not found',
          code: 'NOT_FOUND'
        }
      });
    }
    
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
    const webhook = await db.webhooks.findById(id, org.id);
    
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



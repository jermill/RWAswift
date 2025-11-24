/**
 * Webhook Delivery Service
 * Handles webhook event delivery with retry logic
 */

const axios = require('axios');
const { createHmacSignature } = require('../utils/crypto');
const config = require('../config');

// Mock database for webhook deliveries
const mockDeliveryLog = [];

/**
 * Deliver webhook event
 * @param {object} webhook - Webhook configuration
 * @param {object} event - Event data
 * @param {number} attempt - Current attempt number (for retries)
 * @returns {Promise<object>} Delivery result
 */
async function deliverWebhook(webhook, event, attempt = 1) {
  const startTime = Date.now();
  const deliveryId = require('crypto').randomUUID();
  
  try {
    // Prepare payload
    const payload = {
      id: deliveryId,
      type: event.type,
      created: new Date().toISOString(),
      data: event.data
    };
    
    const payloadString = JSON.stringify(payload);
    
    // Generate HMAC signature
    const signature = createHmacSignature(payloadString, webhook.secret);
    
    // Set timeout from webhook config
    const timeout = (webhook.timeoutSeconds || 10) * 1000;
    
    console.log(`📤 Delivering webhook ${deliveryId} to ${webhook.url} (attempt ${attempt})`);
    
    // Send webhook
    const response = await axios.post(webhook.url, payload, {
      headers: {
        'Content-Type': 'application/json',
        'X-RWAswift-Signature': `sha256=${signature}`,
        'X-RWAswift-Delivery-ID': deliveryId,
        'X-RWAswift-Event': event.type,
        'User-Agent': 'RWAswift-Webhook/1.0'
      },
      timeout,
      validateStatus: (status) => status >= 200 && status < 300
    });
    
    const responseTime = Date.now() - startTime;
    
    // Log successful delivery
    const deliveryRecord = {
      id: deliveryId,
      webhookId: webhook.id,
      verificationId: event.data.verificationId || null,
      eventType: event.type,
      payload,
      httpStatus: response.status,
      responseBody: JSON.stringify(response.data).substring(0, 1000), // Limit size
      responseTimeMs: responseTime,
      success: true,
      errorMessage: null,
      attemptNumber: attempt,
      nextRetryAt: null,
      createdAt: new Date().toISOString(),
      deliveredAt: new Date().toISOString()
    };
    
    mockDeliveryLog.push(deliveryRecord);
    
    console.log(`✅ Webhook delivered successfully (${responseTime}ms, status: ${response.status})`);
    
    return {
      success: true,
      deliveryId,
      httpStatus: response.status,
      responseTime: responseTime
    };
    
  } catch (error) {
    const responseTime = Date.now() - startTime;
    const httpStatus = error.response?.status || null;
    const errorMessage = error.message;
    
    // Log failed delivery
    const deliveryRecord = {
      id: deliveryId,
      webhookId: webhook.id,
      verificationId: event.data.verificationId || null,
      eventType: event.type,
      payload: event,
      httpStatus,
      responseBody: error.response?.data ? JSON.stringify(error.response.data).substring(0, 1000) : null,
      responseTimeMs: responseTime,
      success: false,
      errorMessage,
      attemptNumber: attempt,
      nextRetryAt: null,
      createdAt: new Date().toISOString(),
      deliveredAt: null
    };
    
    console.error(`❌ Webhook delivery failed (attempt ${attempt}): ${errorMessage}`);
    
    // Retry logic
    const maxRetries = webhook.retryCount || 3;
    if (attempt < maxRetries) {
      // Calculate exponential backoff delay
      const delay = Math.min(1000 * Math.pow(2, attempt), 60000); // Max 60s
      deliveryRecord.nextRetryAt = new Date(Date.now() + delay).toISOString();
      
      console.log(`🔄 Scheduling retry ${attempt + 1}/${maxRetries} in ${delay}ms`);
      
      mockDeliveryLog.push(deliveryRecord);
      
      // Schedule retry
      setTimeout(() => {
        deliverWebhook(webhook, event, attempt + 1);
      }, delay);
      
      return {
        success: false,
        deliveryId,
        httpStatus,
        errorMessage,
        willRetry: true,
        nextRetryIn: delay
      };
    } else {
      console.error(`⚠️ Max retries reached for webhook ${webhook.id}`);
      mockDeliveryLog.push(deliveryRecord);
      
      return {
        success: false,
        deliveryId,
        httpStatus,
        errorMessage,
        willRetry: false
      };
    }
  }
}

/**
 * Trigger webhook event for verification completion
 * @param {string} orgId - Organization ID
 * @param {object} verification - Verification data
 * @returns {Promise<void>}
 */
async function triggerVerificationWebhook(orgId, verification, webhooks = []) {
  if (!config.features.webhooksEnabled) {
    console.log('ℹ️  Webhooks disabled in config');
    return;
  }
  
  // Find active webhooks for this org
  const orgWebhooks = webhooks.filter(w => 
    w.orgId === orgId && 
    w.isActive === true
  );
  
  if (orgWebhooks.length === 0) {
    console.log(`ℹ️  No active webhooks found for org ${orgId}`);
    return;
  }
  
  // Prepare event data
  const event = {
    type: 'verification.completed',
    data: {
      verificationId: verification.id,
      status: verification.status,
      decision: verification.decision,
      investorEmail: verification.investorEmail,
      riskScore: verification.riskScore,
      riskLevel: verification.riskLevel,
      processingTimeMs: verification.processingTimeMs,
      completedAt: verification.processingCompletedAt,
      createdAt: verification.createdAt
    }
  };
  
  // Deliver to all webhooks
  const deliveryPromises = orgWebhooks.map(webhook => {
    // Check if webhook is subscribed to this event type
    const subscribedEvents = webhook.events || ['verification.completed'];
    if (!subscribedEvents.includes(event.type)) {
      return Promise.resolve({ skipped: true });
    }
    
    return deliverWebhook(webhook, event);
  });
  
  await Promise.allSettled(deliveryPromises);
}

/**
 * Get webhook delivery logs
 * @param {string} webhookId - Webhook ID
 * @param {object} options - Query options
 * @returns {array} Delivery logs
 */
function getDeliveryLogs(webhookId, options = {}) {
  let logs = mockDeliveryLog.filter(log => log.webhookId === webhookId);
  
  // Sort by created date (newest first)
  logs.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  
  // Apply pagination
  const limit = options.limit || 50;
  const offset = options.offset || 0;
  
  return logs.slice(offset, offset + limit);
}

/**
 * Test webhook delivery
 * @param {object} webhook - Webhook configuration
 * @returns {Promise<object>} Test result
 */
async function testWebhook(webhook) {
  const event = {
    type: 'webhook.test',
    data: {
      message: 'This is a test webhook from RWAswift',
      timestamp: new Date().toISOString(),
      webhookId: webhook.id
    }
  };
  
  return await deliverWebhook(webhook, event);
}

module.exports = {
  deliverWebhook,
  triggerVerificationWebhook,
  getDeliveryLogs,
  testWebhook,
  // Export for testing
  _mockDeliveryLog: mockDeliveryLog
};


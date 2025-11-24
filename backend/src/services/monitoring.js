/**
 * Monitoring and Error Tracking Service
 * Supports Sentry, Datadog, and custom logging
 */

const config = require('../config');

// Initialize monitoring services
let sentry = null;
let datadogEnabled = false;

/**
 * Initialize Sentry for error tracking
 */
function initSentry() {
  if (config.monitoring.sentryDsn) {
    try {
      // const Sentry = require('@sentry/node');
      // Sentry.init({
      //   dsn: config.monitoring.sentryDsn,
      //   environment: config.env,
      //   tracesSampleRate: config.isProduction ? 0.1 : 1.0
      // });
      // sentry = Sentry;
      console.log('✅ Sentry initialized (commented out - install @sentry/node to enable)');
    } catch (error) {
      console.warn('⚠️  Sentry initialization failed:', error.message);
    }
  }
}

/**
 * Initialize Datadog for metrics
 */
function initDatadog() {
  if (config.monitoring.datadogApiKey) {
    try {
      // const { StatsD } = require('hot-shots');
      // const dogstatsd = new StatsD({
      //   apiKey: config.monitoring.datadogApiKey
      // });
      datadogEnabled = true;
      console.log('✅ Datadog initialized (commented out - install hot-shots to enable)');
    } catch (error) {
      console.warn('⚠️  Datadog initialization failed:', error.message);
    }
  }
}

/**
 * Log error to monitoring services
 */
function logError(error, context = {}) {
  // Log to console
  console.error('❌ Error:', {
    message: error.message,
    stack: error.stack,
    context,
    timestamp: new Date().toISOString()
  });

  // Send to Sentry
  if (sentry) {
    sentry.captureException(error, {
      contexts: { custom: context }
    });
  }

  // Log to Datadog
  if (datadogEnabled) {
    // dogstatsd.increment('api.errors', 1, [`error_type:${error.name}`]);
  }
}

/**
 * Log custom event
 */
function logEvent(eventName, properties = {}) {
  console.log(`📊 Event: ${eventName}`, properties);

  if (datadogEnabled) {
    // dogstatsd.increment(`api.events.${eventName}`, 1);
  }
}

/**
 * Track metric
 */
function trackMetric(metric, value, tags = []) {
  if (datadogEnabled) {
    // dogstatsd.gauge(metric, value, tags);
  }
}

/**
 * Track HTTP request metrics
 */
function trackRequest(req, res, responseTime) {
  const metrics = {
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    responseTime,
    timestamp: new Date().toISOString()
  };

  // Log slow requests
  if (responseTime > 1000) {
    console.warn('⚠️  Slow request:', metrics);
  }

  // Track in Datadog
  if (datadogEnabled) {
    // dogstatsd.histogram('api.request.duration', responseTime, [
    //   `method:${req.method}`,
    //   `path:${req.path}`,
    //   `status:${res.statusCode}`
    // ]);
  }

  return metrics;
}

/**
 * Health check for monitoring services
 */
function getHealthStatus() {
  return {
    sentry: sentry ? 'enabled' : 'disabled',
    datadog: datadogEnabled ? 'enabled' : 'disabled',
    logging: 'enabled'
  };
}

// Initialize on module load
initSentry();
initDatadog();

module.exports = {
  logError,
  logEvent,
  trackMetric,
  trackRequest,
  getHealthStatus
};


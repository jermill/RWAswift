/**
 * RWAswift Backend Server
 * Main Express application entry point
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const config = require('./src/config');

// Initialize Express app
const app = express();
const PORT = config.port;

// ===================================
// MIDDLEWARE CONFIGURATION
// ===================================

// Security headers
app.use(helmet());

// CORS configuration
const corsOptions = {
  origin: config.security.allowedOrigins.length > 0 
    ? config.security.allowedOrigins 
    : ['http://localhost:3000'],
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Response compression
app.use(compression());

// Request logging
if (!config.isTest) {
  app.use(morgan(config.isDevelopment ? 'dev' : 'combined'));
}

// Request ID middleware (for tracking)
app.use((req, res, next) => {
  req.id = require('crypto').randomUUID();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Request timestamp
app.use((req, res, next) => {
  req.startTime = Date.now();
  next();
});

// ===================================
// HEALTH CHECK ENDPOINT
// ===================================

app.get('/health', (req, res) => {
  const healthCheck = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
    version: require('./package.json').version,
    features: {
      mockKyc: config.features.mockKycEnabled,
      webhooks: config.features.webhooksEnabled
    },
    requestId: req.id
  };
  
  res.status(200).json(healthCheck);
});

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    message: 'RWAswift API - Real World Asset Compliance Platform',
    version: '1.0.0',
    documentation: '/api/docs',
    status: 'operational'
  });
});

// ===================================
// API ROUTES
// ===================================

// API v1 routes
app.use('/api/v1', require('./src/routes'));

// ===================================
// ERROR HANDLING
// ===================================

// 404 Not Found handler
app.use((req, res, next) => {
  const error = new Error('Route not found');
  error.status = 404;
  error.requestId = req.id;
  next(error);
});

// Global error handler
app.use((err, req, res, next) => {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';
  
  // Log error details
  console.error(`[${new Date().toISOString()}] Error:`, {
    requestId: req.id,
    method: req.method,
    path: req.path,
    statusCode,
    message,
      stack: config.isDevelopment ? err.stack : undefined
  });

  // Send error response
  res.status(statusCode).json({
    error: {
      message,
      statusCode,
      requestId: req.id,
      timestamp: new Date().toISOString(),
      ...(config.isDevelopment && { stack: err.stack })
    }
  });
});

// ===================================
// SERVER INITIALIZATION
// ===================================

let server;

const startServer = async () => {
  try {
    // Initialize database connection (optional for MVP)
    if (config.database.url) {
      const db = require('./src/config/database');
      const dbConnected = await db.testConnection();
      if (!dbConnected) {
        console.warn('⚠️  Database connection failed, running without database');
      }
    } else {
      console.log('ℹ️  No database configured, running in standalone mode');
    }
    
    // TODO: Initialize Redis connection here
    
    server = app.listen(PORT, () => {
      console.log('🚀 ═══════════════════════════════════════════════════');
      console.log(`🚀 RWAswift API Server`);
      console.log(`🚀 Environment: ${config.env}`);
      console.log(`🚀 Port: ${PORT}`);
      console.log(`🚀 Health Check: http://localhost:${PORT}/health`);
      console.log(`🚀 Documentation: http://localhost:${PORT}/api/docs`);
      console.log(`🚀 Features: Mock KYC=${config.features.mockKycEnabled}, Webhooks=${config.features.webhooksEnabled}`);
      console.log('🚀 ═══════════════════════════════════════════════════');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      console.error('Unhandled Rejection at:', promise, 'reason:', reason);
      // Close server and exit
      gracefulShutdown('unhandledRejection');
    });

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      console.error('Uncaught Exception:', error);
      gracefulShutdown('uncaughtException');
    });

  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// ===================================
// GRACEFUL SHUTDOWN
// ===================================

const gracefulShutdown = (signal) => {
  console.log(`\n⚠️  ${signal} signal received: closing HTTP server`);
  
  if (server) {
    server.close(() => {
      console.log('✅ HTTP server closed');
      
      // TODO: Close database connections
      // TODO: Close Redis connections
      // TODO: Clear any pending jobs
      
      console.log('✅ Graceful shutdown complete');
      process.exit(0);
    });

    // Force shutdown after 10 seconds
    setTimeout(() => {
      console.error('⚠️  Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
};

// Listen for termination signals
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

// ===================================
// START SERVER
// ===================================

if (require.main === module) {
  startServer();
}

// Export for testing
module.exports = app;


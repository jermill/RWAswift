/**
 * Email Notification Service
 * Handles all email communications
 * Uses nodemailer for SMTP (can be swapped for SendGrid/SES)
 */

const nodemailer = require('nodemailer');
const config = require('../config');

// Email templates
const TEMPLATES = {
  VERIFICATION_STARTED: 'verification_started',
  VERIFICATION_COMPLETED: 'verification_completed',
  VERIFICATION_APPROVED: 'verification_approved',
  VERIFICATION_REJECTED: 'verification_rejected',
  WELCOME: 'welcome',
  PASSWORD_RESET: 'password_reset',
  API_KEY_ROTATED: 'api_key_rotated'
};

/**
 * Create email transporter
 * In development: uses Ethereal fake SMTP (for testing)
 * In production: uses SendGrid or AWS SES
 */
let transporter;

async function initializeTransporter() {
  if (config.isProduction && config.services.sendgrid.apiKey) {
    // Production: Use SendGrid
    transporter = nodemailer.createTransporter({
      host: 'smtp.sendgrid.net',
      port: 587,
      auth: {
        user: 'apikey',
        pass: config.services.sendgrid.apiKey
      }
    });
  } else {
    // Development: Use Ethereal fake SMTP
    try {
      const testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransporter({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      console.log('📧 Email service: Using Ethereal test account');
      console.log(`   Preview emails at: https://ethereal.email`);
    } catch (error) {
      console.warn('⚠️  Email service: Could not create test account, using mock mode');
      transporter = null;
    }
  }
}

/**
 * Send email
 * @param {object} options - Email options
 * @returns {Promise<object>} Send result
 */
async function sendEmail(options) {
  const { to, subject, html, text, from } = options;

  // Initialize transporter if not already done
  if (!transporter) {
    await initializeTransporter();
  }

  // If still no transporter, just log (mock mode)
  if (!transporter) {
    console.log(`📧 [MOCK] Email sent to ${to}: ${subject}`);
    return {
      success: true,
      mode: 'mock',
      messageId: `mock-${Date.now()}`,
      preview: null
    };
  }

  try {
    const info = await transporter.sendMail({
      from: from || config.services.sendgrid.fromEmail || 'RWAswift <noreply@rwaswift.com>',
      to,
      subject,
      text,
      html
    });

    // Get preview URL for Ethereal
    const previewUrl = config.isDevelopment ? nodemailer.getTestMessageUrl(info) : null;

    if (previewUrl) {
      console.log(`📧 Email sent to ${to}: ${subject}`);
      console.log(`   Preview: ${previewUrl}`);
    }

    return {
      success: true,
      mode: config.isDevelopment ? 'ethereal' : 'production',
      messageId: info.messageId,
      preview: previewUrl
    };

  } catch (error) {
    console.error('Email send error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Send verification started email
 * @param {string} email - Investor email
 * @param {object} verification - Verification data
 */
async function sendVerificationStarted(email, verification) {
  if (!config.features.emailNotificationsEnabled) {
    return { success: false, reason: 'Email notifications disabled' };
  }

  const subject = 'KYC Verification Started - RWAswift';
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #0066FF 0%, #00D4AA 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .button { display: inline-block; padding: 12px 30px; background: #0066FF; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚡ Verification Started</h1>
    </div>
    <div class="content">
      <p>Hi there,</p>
      <p>We've started processing your KYC verification for investment opportunities.</p>
      
      <p><strong>Verification ID:</strong> ${verification.id}</p>
      <p><strong>Estimated Time:</strong> 2 minutes</p>
      
      <p>We're checking:</p>
      <ul>
        <li>✓ Identity documents</li>
        <li>✓ Sanctions screening</li>
        <li>✓ Risk assessment</li>
      </ul>
      
      <p>You'll receive another email once verification is complete.</p>
      
      <p>Best regards,<br>The RWAswift Team</p>
    </div>
    <div class="footer">
      <p>RWAswift - Real World Asset Compliance Platform</p>
      <p>This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Verification Started

Hi there,

We've started processing your KYC verification.

Verification ID: ${verification.id}
Estimated Time: 2 minutes

You'll receive another email once verification is complete.

Best regards,
The RWAswift Team
  `;

  return await sendEmail({ to: email, subject, html, text });
}

/**
 * Send verification completed email
 * @param {string} email - Investor email
 * @param {object} verification - Verification data
 */
async function sendVerificationCompleted(email, verification) {
  if (!config.features.emailNotificationsEnabled) {
    return { success: false, reason: 'Email notifications disabled' };
  }

  const isApproved = verification.decision === 'approved';
  const emoji = isApproved ? '✅' : '❌';
  const status = isApproved ? 'Approved' : 'Rejected';
  const color = isApproved ? '#00D4AA' : '#FF4444';

  const subject = `KYC Verification ${status} - RWAswift`;
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: ${color}; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .status-badge { display: inline-block; padding: 10px 20px; background: ${color}; color: white; border-radius: 20px; font-weight: bold; }
    .info-box { background: white; padding: 15px; border-left: 4px solid ${color}; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${emoji} Verification ${status}</h1>
    </div>
    <div class="content">
      <p>Hi there,</p>
      <p>Your KYC verification has been completed.</p>
      
      <div class="info-box">
        <p><strong>Status:</strong> <span class="status-badge">${status}</span></p>
        <p><strong>Verification ID:</strong> ${verification.id}</p>
        <p><strong>Risk Score:</strong> ${verification.riskScore}/100</p>
        <p><strong>Processing Time:</strong> ${Math.round(verification.processingTimeMs / 1000)} seconds</p>
      </div>
      
      ${isApproved ? `
        <p><strong>Next Steps:</strong></p>
        <ul>
          <li>You can now proceed with your investment</li>
          <li>Your verification is valid for 12 months</li>
          <li>Keep your verification ID for reference</li>
        </ul>
      ` : `
        <p><strong>Reason:</strong> ${verification.decisionReason}</p>
        <p>If you believe this is an error, please contact support with your verification ID.</p>
      `}
      
      <p>Best regards,<br>The RWAswift Team</p>
    </div>
    <div class="footer">
      <p>RWAswift - Real World Asset Compliance Platform</p>
      <p>This is an automated message, please do not reply.</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Verification ${status}

Hi there,

Your KYC verification has been completed.

Status: ${status}
Verification ID: ${verification.id}
Risk Score: ${verification.riskScore}/100
Processing Time: ${Math.round(verification.processingTimeMs / 1000)} seconds

${isApproved ? 
  'You can now proceed with your investment.' : 
  `Reason: ${verification.decisionReason}`
}

Best regards,
The RWAswift Team
  `;

  return await sendEmail({ to: email, subject, html, text });
}

/**
 * Send welcome email to new organization
 * @param {string} email - Organization email
 * @param {object} organization - Organization data
 * @param {string} apiKey - API key (shown only once)
 */
async function sendWelcomeEmail(email, organization, apiKey) {
  if (!config.features.emailNotificationsEnabled) {
    return { success: false, reason: 'Email notifications disabled' };
  }

  const subject = 'Welcome to RWAswift! 🚀';
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #0066FF 0%, #00D4AA 100%); color: white; padding: 40px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .api-key { background: #fff; border: 2px dashed #0066FF; padding: 15px; font-family: monospace; word-break: break-all; margin: 20px 0; }
    .button { display: inline-block; padding: 12px 30px; background: #0066FF; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🚀 Welcome to RWAswift!</h1>
      <p>Your account is ready</p>
    </div>
    <div class="content">
      <p>Hi ${organization.name},</p>
      <p>Welcome to RWAswift! Your compliance platform is ready to go.</p>
      
      <h3>Your API Key</h3>
      <div class="warning">
        <strong>⚠️ Important:</strong> Save this API key securely. It will not be shown again.
      </div>
      <div class="api-key">${apiKey}</div>
      
      <h3>Quick Start</h3>
      <ol>
        <li>Add the API key to your application</li>
        <li>Make your first verification request</li>
        <li>Set up webhooks for real-time notifications</li>
      </ol>
      
      <h3>Your Plan: ${organization.plan}</h3>
      <p>Monthly Limit: ${organization.monthlyLimit} verifications</p>
      
      <a href="https://docs.rwaswift.com" class="button">View Documentation</a>
      
      <p>Need help? Contact us at support@rwaswift.com</p>
      
      <p>Best regards,<br>The RWAswift Team</p>
    </div>
    <div class="footer">
      <p>RWAswift - Real World Asset Compliance Platform</p>
      <p>Make RWA compliance as fast as a Venmo payment ⚡</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
Welcome to RWAswift!

Hi ${organization.name},

Your account is ready to go.

YOUR API KEY (save securely):
${apiKey}

Quick Start:
1. Add the API key to your application
2. Make your first verification request
3. Set up webhooks for real-time notifications

Your Plan: ${organization.plan}
Monthly Limit: ${organization.monthlyLimit} verifications

Documentation: https://docs.rwaswift.com

Best regards,
The RWAswift Team
  `;

  return await sendEmail({ to: email, subject, html, text });
}

/**
 * Send API key rotated notification
 * @param {string} email - Organization email
 * @param {string} apiKeyPrefix - New API key prefix
 */
async function sendApiKeyRotated(email, apiKeyPrefix) {
  if (!config.features.emailNotificationsEnabled) {
    return { success: false, reason: 'Email notifications disabled' };
  }

  const subject = '🔒 API Key Rotated - RWAswift';
  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #ffc107; color: #333; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
    .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔒 API Key Rotated</h1>
    </div>
    <div class="content">
      <p>Hi there,</p>
      <p>Your RWAswift API key has been rotated.</p>
      
      <div class="warning">
        <strong>Action Required:</strong> Update your applications with the new API key.
      </div>
      
      <p><strong>New Key Prefix:</strong> ${apiKeyPrefix}...</p>
      <p><strong>Old Key Status:</strong> Deactivated immediately</p>
      
      <p>If you didn't request this change, please contact support immediately.</p>
      
      <p>Best regards,<br>The RWAswift Team</p>
    </div>
    <div class="footer">
      <p>RWAswift - Real World Asset Compliance Platform</p>
    </div>
  </div>
</body>
</html>
  `;

  const text = `
API Key Rotated

Hi there,

Your RWAswift API key has been rotated.

New Key Prefix: ${apiKeyPrefix}...
Old Key Status: Deactivated immediately

Action Required: Update your applications with the new API key.

If you didn't request this change, please contact support immediately.

Best regards,
The RWAswift Team
  `;

  return await sendEmail({ to: email, subject, html, text });
}

/**
 * Test email configuration
 * @param {string} email - Test recipient
 * @returns {Promise<object>} Test result
 */
async function sendTestEmail(email) {
  const subject = '✅ RWAswift Email Test';
  const html = `
<!DOCTYPE html>
<html>
<body style="font-family: Arial, sans-serif; padding: 20px;">
  <h1>Email Service Working! ✅</h1>
  <p>This is a test email from RWAswift.</p>
  <p>If you're seeing this, your email configuration is working correctly.</p>
  <p>Timestamp: ${new Date().toISOString()}</p>
</body>
</html>
  `;

  const text = `
Email Service Working!

This is a test email from RWAswift.
Timestamp: ${new Date().toISOString()}
  `;

  return await sendEmail({ to: email, subject, html, text });
}

module.exports = {
  sendEmail,
  sendVerificationStarted,
  sendVerificationCompleted,
  sendWelcomeEmail,
  sendApiKeyRotated,
  sendTestEmail,
  initializeTransporter,
  TEMPLATES
};


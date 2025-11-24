# RWAswift Technical Implementation Guide

## 🚀 Quick Start for Developers

This guide provides step-by-step implementation details for building RWAswift MVP.

---

## 1. Development Environment Setup

### Prerequisites
```bash
# Required versions
Node.js: 20.x LTS
PostgreSQL: 15+
Redis: 7+
Docker: 24+
```

### Initial Setup
```bash
# Clone and setup
git clone https://github.com/your-org/rwaswift.git
cd rwaswift
npm install
cp .env.example .env

# Start services
docker-compose up -d
npm run db:migrate
npm run dev
```

---

## 2. Core API Implementation

### 2.1 Verification Endpoint
```javascript
// backend/routes/verify.js
const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const persona = require('../services/persona');
const riskEngine = require('../services/riskEngine');
const db = require('../services/database');

router.post('/api/v1/verify', async (req, res) => {
  const startTime = Date.now();
  const verificationId = uuidv4();
  
  try {
    // Step 1: Validate input
    const { email, firstName, lastName, documents } = req.body;
    
    if (!email || !firstName || !lastName) {
      return res.status(400).json({ 
        error: 'Missing required fields' 
      });
    }
    
    // Step 2: Create verification record
    await db.query(
      `INSERT INTO verifications 
       (id, email, first_name, last_name, status, created_at) 
       VALUES ($1, $2, $3, $4, 'processing', NOW())`,
      [verificationId, email, firstName, lastName]
    );
    
    // Step 3: Process asynchronously
    processVerification(verificationId, req.body);
    
    // Step 4: Return immediate response
    res.json({
      verificationId,
      status: 'processing',
      estimatedTime: 120,
      message: 'Verification started'
    });
    
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ 
      error: 'Verification failed',
      verificationId 
    });
  }
});

async function processVerification(verificationId, data) {
  try {
    // Parallel processing for speed
    const [
      personaResult,
      sanctionsResult,
      riskScore
    ] = await Promise.all([
      persona.verifyIdentity(data),
      checkSanctions(data),
      riskEngine.calculateScore(data)
    ]);
    
    // Make decision
    const decision = makeDecision({
      personaResult,
      sanctionsResult,
      riskScore
    });
    
    // Update database
    await db.query(
      `UPDATE verifications 
       SET status = $1, risk_score = $2, completed_at = NOW(),
           processing_time_ms = $3
       WHERE id = $4`,
      [
        decision.approved ? 'approved' : 'rejected',
        riskScore,
        Date.now() - startTime,
        verificationId
      ]
    );
    
    // Send webhook
    await sendWebhook(verificationId, decision);
    
  } catch (error) {
    console.error('Processing error:', error);
    await db.query(
      `UPDATE verifications SET status = 'failed' WHERE id = $1`,
      [verificationId]
    );
  }
}
```

### 2.2 Risk Scoring Engine
```javascript
// backend/services/riskEngine.js
class RiskEngine {
  constructor() {
    this.weights = {
      documentQuality: 0.2,
      sanctionsHit: 0.3,
      countryRisk: 0.2,
      behaviorAnalysis: 0.15,
      velocityCheck: 0.15
    };
  }
  
  async calculateScore(data) {
    const factors = await Promise.all([
      this.assessDocumentQuality(data.documents),
      this.checkSanctions(data),
      this.evaluateCountryRisk(data.country),
      this.analyzeBehavior(data),
      this.velocityCheck(data.email)
    ]);
    
    // Weighted scoring algorithm
    const score = factors.reduce((total, factor, index) => {
      const weight = Object.values(this.weights)[index];
      return total + (factor.score * weight);
    }, 0);
    
    return {
      score: Math.round(score),
      factors,
      recommendation: this.getRecommendation(score)
    };
  }
  
  getRecommendation(score) {
    if (score < 25) return 'auto_approve';
    if (score < 50) return 'manual_review';
    if (score < 75) return 'enhanced_due_diligence';
    return 'reject';
  }
  
  async assessDocumentQuality(documents) {
    // Use AI to assess document authenticity
    const qualityScore = await this.callAIModel(documents);
    return {
      name: 'document_quality',
      score: qualityScore,
      details: {
        tampering_detected: false,
        resolution_adequate: true,
        metadata_valid: true
      }
    };
  }
  
  async velocityCheck(email) {
    // Check how many verifications from this email recently
    const recentAttempts = await db.query(
      `SELECT COUNT(*) FROM verifications 
       WHERE email = $1 AND created_at > NOW() - INTERVAL '1 hour'`,
      [email]
    );
    
    const count = recentAttempts.rows[0].count;
    
    if (count > 5) return { score: 80, flag: 'high_velocity' };
    if (count > 2) return { score: 40, flag: 'medium_velocity' };
    return { score: 10, flag: 'normal' };
  }
}
```

### 2.3 Sanctions Checking Service
```javascript
// backend/services/sanctions.js
const axios = require('axios');
const redis = require('./redis');

class SanctionsService {
  constructor() {
    this.providers = {
      OFAC: process.env.OFAC_API_URL,
      EU: process.env.EU_SANCTIONS_API_URL,
      UN: process.env.UN_SANCTIONS_API_URL
    };
  }
  
  async checkAll(person) {
    const cacheKey = `sanctions:${person.firstName}:${person.lastName}`;
    
    // Check cache first (24 hour TTL)
    const cached = await redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    // Parallel check all lists
    const results = await Promise.all(
      Object.entries(this.providers).map(([source, url]) =>
        this.checkList(source, url, person)
      )
    );
    
    const consolidated = {
      hit: results.some(r => r.hit),
      sources: results.filter(r => r.hit),
      checkedAt: new Date().toISOString()
    };
    
    // Cache result
    await redis.setex(cacheKey, 86400, JSON.stringify(consolidated));
    
    return consolidated;
  }
  
  async checkList(source, url, person) {
    try {
      const response = await axios.post(url, {
        firstName: person.firstName,
        lastName: person.lastName,
        dob: person.dateOfBirth,
        fuzzyMatch: true,
        threshold: 0.85
      }, {
        headers: {
          'Authorization': `Bearer ${process.env[`${source}_API_KEY`]}`
        },
        timeout: 5000
      });
      
      return {
        source,
        hit: response.data.matches.length > 0,
        matches: response.data.matches,
        confidence: response.data.confidence
      };
      
    } catch (error) {
      console.error(`Sanctions check failed for ${source}:`, error);
      // Fail open - don't block on API failure
      return {
        source,
        hit: false,
        error: true
      };
    }
  }
}
```

---

## 3. Database Schema Implementation

### 3.1 Complete PostgreSQL Schema
```sql
-- migrations/001_initial_schema.sql

-- Organizations table
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    api_key VARCHAR(255) UNIQUE NOT NULL,
    api_secret VARCHAR(255) NOT NULL,
    plan VARCHAR(50) DEFAULT 'starter',
    monthly_limit INTEGER DEFAULT 10000,
    current_usage INTEGER DEFAULT 0,
    stripe_customer_id VARCHAR(255),
    stripe_subscription_id VARCHAR(255),
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Verifications table
CREATE TABLE verifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    external_id VARCHAR(255), -- Customer's reference ID
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    middle_name VARCHAR(100),
    date_of_birth DATE,
    country VARCHAR(3),
    status VARCHAR(20) DEFAULT 'pending',
    risk_score INTEGER,
    risk_factors JSONB,
    decision_reason TEXT,
    processing_time_ms INTEGER,
    metadata JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    expires_at TIMESTAMP,
    
    INDEX idx_org_status (org_id, status),
    INDEX idx_email (email),
    INDEX idx_created_at (created_at DESC)
);

-- Documents table
CREATE TABLE documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_id UUID REFERENCES verifications(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- passport, driver_license, etc
    country VARCHAR(3),
    number VARCHAR(100),
    s3_url TEXT,
    extracted_data JSONB,
    authenticity_score DECIMAL(3,2),
    expiry_date DATE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_verification (verification_id)
);

-- Sanctions checks table
CREATE TABLE sanctions_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_id UUID REFERENCES verifications(id) ON DELETE CASCADE,
    source VARCHAR(50), -- OFAC, EU, UN, etc
    hit BOOLEAN DEFAULT false,
    matches JSONB,
    checked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_verification_source (verification_id, source)
);

-- API logs table for analytics
CREATE TABLE api_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    endpoint VARCHAR(255),
    method VARCHAR(10),
    request_body JSONB,
    response_status INTEGER,
    response_time_ms INTEGER,
    error_message TEXT,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_org_created (org_id, created_at DESC)
);

-- Webhooks table
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    secret VARCHAR(255),
    events TEXT[], -- array of event types
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_org_active (org_id, active)
);

-- Webhook deliveries table
CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(50),
    payload JSONB,
    response_status INTEGER,
    response_body TEXT,
    attempts INTEGER DEFAULT 1,
    delivered_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    INDEX idx_webhook_created (webhook_id, created_at DESC)
);

-- Create update trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();
```

---

## 4. Frontend Implementation

### 4.1 Verification Widget Component
```typescript
// frontend/components/VerificationWidget.tsx
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';

interface VerificationWidgetProps {
  apiKey: string;
  onSuccess: (verificationId: string) => void;
  onError: (error: Error) => void;
}

export const VerificationWidget: React.FC<VerificationWidgetProps> = ({
  apiKey,
  onSuccess,
  onError
}) => {
  const [step, setStep] = useState<'info' | 'documents' | 'processing' | 'complete'>('info');
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    dateOfBirth: '',
    country: 'US'
  });
  const [documents, setDocuments] = useState<File[]>([]);
  const [progress, setProgress] = useState(0);
  
  const onDrop = useCallback((acceptedFiles: File[]) => {
    setDocuments(prev => [...prev, ...acceptedFiles]);
  }, []);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png'],
      'application/pdf': ['.pdf']
    },
    maxSize: 10485760 // 10MB
  });
  
  const handleSubmit = async () => {
    setStep('processing');
    setProgress(0);
    
    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return prev;
        }
        return prev + 10;
      });
    }, 200);
    
    try {
      // Prepare form data
      const formDataToSend = new FormData();
      Object.entries(formData).forEach(([key, value]) => {
        formDataToSend.append(key, value);
      });
      documents.forEach(doc => {
        formDataToSend.append('documents', doc);
      });
      
      // Submit verification
      const response = await axios.post(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/verify`,
        formDataToSend,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'multipart/form-data'
          }
        }
      );
      
      clearInterval(progressInterval);
      setProgress(100);
      
      // Poll for result
      await pollForResult(response.data.verificationId);
      
    } catch (error) {
      clearInterval(progressInterval);
      onError(error as Error);
    }
  };
  
  const pollForResult = async (verificationId: string) => {
    let attempts = 0;
    const maxAttempts = 60; // 2 minutes max
    
    const poll = async () => {
      attempts++;
      
      const response = await axios.get(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/verify/${verificationId}`,
        {
          headers: {
            'Authorization': `Bearer ${apiKey}`
          }
        }
      );
      
      if (response.data.status === 'processing' && attempts < maxAttempts) {
        setTimeout(poll, 2000); // Poll every 2 seconds
      } else {
        setStep('complete');
        if (response.data.status === 'approved') {
          onSuccess(verificationId);
        } else {
          onError(new Error(`Verification ${response.data.status}`));
        }
      }
    };
    
    await poll();
  };
  
  return (
    <div className="max-w-md mx-auto bg-white rounded-lg shadow-lg p-6">
      {/* Step indicator */}
      <div className="flex justify-between mb-8">
        {['Info', 'Documents', 'Processing', 'Complete'].map((label, index) => (
          <div
            key={label}
            className={`flex items-center ${
              index <= ['info', 'documents', 'processing', 'complete'].indexOf(step)
                ? 'text-blue-600'
                : 'text-gray-400'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              index <= ['info', 'documents', 'processing', 'complete'].indexOf(step)
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200'
            }`}>
              {index + 1}
            </div>
            <span className="ml-2 text-sm">{label}</span>
          </div>
        ))}
      </div>
      
      {/* Step content */}
      {step === 'info' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Quick Verification</h2>
          <p className="text-gray-600">This will only take 2 minutes</p>
          
          <input
            type="email"
            placeholder="Email address"
            className="w-full px-4 py-2 border rounded-lg"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          />
          
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text"
              placeholder="First name"
              className="px-4 py-2 border rounded-lg"
              value={formData.firstName}
              onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
            />
            <input
              type="text"
              placeholder="Last name"
              className="px-4 py-2 border rounded-lg"
              value={formData.lastName}
              onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
            />
          </div>
          
          <input
            type="date"
            placeholder="Date of birth"
            className="w-full px-4 py-2 border rounded-lg"
            value={formData.dateOfBirth}
            onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
          />
          
          <select
            className="w-full px-4 py-2 border rounded-lg"
            value={formData.country}
            onChange={(e) => setFormData({ ...formData, country: e.target.value })}
          >
            <option value="US">United States</option>
            <option value="GB">United Kingdom</option>
            <option value="EU">European Union</option>
            <option value="CA">Canada</option>
            <option value="AU">Australia</option>
          </select>
          
          <button
            onClick={() => setStep('documents')}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700"
          >
            Continue
          </button>
        </div>
      )}
      
      {step === 'documents' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-bold">Upload Documents</h2>
          <p className="text-gray-600">Upload your ID and proof of address</p>
          
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer ${
              isDragActive ? 'border-blue-600 bg-blue-50' : 'border-gray-300'
            }`}
          >
            <input {...getInputProps()} />
            {isDragActive ? (
              <p>Drop the files here...</p>
            ) : (
              <div>
                <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="mt-2">Drag & drop files here, or click to select</p>
                <p className="text-sm text-gray-500 mt-1">PNG, JPG or PDF up to 10MB</p>
              </div>
            )}
          </div>
          
          {documents.length > 0 && (
            <div className="space-y-2">
              {documents.map((doc, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span className="text-sm">{doc.name}</span>
                  <button
                    onClick={() => setDocuments(documents.filter((_, i) => i !== index))}
                    className="text-red-600 text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}
          
          <button
            onClick={handleSubmit}
            disabled={documents.length === 0}
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
          >
            Start Verification
          </button>
        </div>
      )}
      
      {step === 'processing' && (
        <div className="space-y-4 text-center">
          <h2 className="text-2xl font-bold">Verifying...</h2>
          <p className="text-gray-600">This usually takes less than 2 minutes</p>
          
          <div className="relative pt-1">
            <div className="overflow-hidden h-2 text-xs flex rounded bg-gray-200">
              <div
                style={{ width: `${progress}%` }}
                className="shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center bg-blue-600 transition-all duration-500"
              />
            </div>
          </div>
          
          <div className="space-y-2 text-sm text-gray-600">
            <p className={progress > 20 ? 'text-green-600' : ''}>
              ✓ Documents uploaded
            </p>
            <p className={progress > 40 ? 'text-green-600' : ''}>
              ✓ Identity verified
            </p>
            <p className={progress > 60 ? 'text-green-600' : ''}>
              ✓ Sanctions check complete
            </p>
            <p className={progress > 80 ? 'text-green-600' : ''}>
              ✓ Risk assessment complete
            </p>
          </div>
        </div>
      )}
      
      {step === 'complete' && (
        <div className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold">Verification Complete!</h2>
          <p className="text-gray-600">You're all set to start investing</p>
        </div>
      )}
    </div>
  );
};
```

---

## 5. Integration Examples

### 5.1 Client SDK Implementation
```javascript
// sdk/rwaswift.js
class RWAswift {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.baseURL = options.baseURL || 'https://api.rwaswift.com/v1';
    this.timeout = options.timeout || 30000;
  }
  
  async verify(data) {
    const response = await fetch(`${this.baseURL}/verify`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      throw new Error(`Verification failed: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  async getStatus(verificationId) {
    const response = await fetch(`${this.baseURL}/verify/${verificationId}`, {
      headers: {
        'Authorization': `Bearer ${this.apiKey}`
      }
    });
    
    return response.json();
  }
  
  async waitForCompletion(verificationId, maxWaitMs = 120000) {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      const status = await this.getStatus(verificationId);
      
      if (status.status !== 'processing') {
        return status;
      }
      
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Verification timeout');
  }
}

// Usage example
const rwaswift = new RWAswift('sk_live_...');

const verification = await rwaswift.verify({
  email: 'investor@example.com',
  firstName: 'John',
  lastName: 'Doe'
});

const result = await rwaswift.waitForCompletion(verification.verificationId);
console.log('Verification result:', result);
```

---

## 6. Deployment Configuration

### 6.1 Production Docker Setup
```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
EXPOSE 3001
CMD ["node", "server.js"]
```

### 6.2 Kubernetes Deployment
```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rwaswift-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rwaswift-api
  template:
    metadata:
      labels:
        app: rwaswift-api
    spec:
      containers:
      - name: api
        image: rwaswift/api:latest
        ports:
        - containerPort: 3001
        env:
        - name: NODE_ENV
          value: production
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: rwaswift-secrets
              key: database-url
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
---
apiVersion: v1
kind: Service
metadata:
  name: rwaswift-api-service
spec:
  selector:
    app: rwaswift-api
  ports:
  - port: 80
    targetPort: 3001
  type: LoadBalancer
```

---

## 7. Monitoring & Observability

### 7.1 Health Check Implementation
```javascript
// backend/health.js
router.get('/health', async (req, res) => {
  const checks = {
    api: 'healthy',
    database: 'unknown',
    redis: 'unknown',
    persona: 'unknown'
  };
  
  // Check database
  try {
    await db.query('SELECT 1');
    checks.database = 'healthy';
  } catch (error) {
    checks.database = 'unhealthy';
  }
  
  // Check Redis
  try {
    await redis.ping();
    checks.redis = 'healthy';
  } catch (error) {
    checks.redis = 'unhealthy';
  }
  
  // Check Persona API
  try {
    await axios.get('https://api.withpersona.com/health');
    checks.persona = 'healthy';
  } catch (error) {
    checks.persona = 'degraded';
  }
  
  const allHealthy = Object.values(checks).every(s => s === 'healthy');
  
  res.status(allHealthy ? 200 : 503).json({
    status: allHealthy ? 'healthy' : 'degraded',
    checks,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});
```

---

## 8. Testing Strategy

### 8.1 Unit Test Example
```javascript
// tests/riskEngine.test.js
const { RiskEngine } = require('../services/riskEngine');

describe('RiskEngine', () => {
  let engine;
  
  beforeEach(() => {
    engine = new RiskEngine();
  });
  
  test('should auto-approve low risk scores', async () => {
    const result = await engine.calculateScore({
      email: 'test@example.com',
      country: 'US',
      documents: ['valid_passport.jpg']
    });
    
    expect(result.score).toBeLessThan(25);
    expect(result.recommendation).toBe('auto_approve');
  });
  
  test('should flag high-risk countries', async () => {
    const result = await engine.calculateScore({
      email: 'test@example.com',
      country: 'KP', // North Korea
      documents: ['passport.jpg']
    });
    
    expect(result.score).toBeGreaterThan(75);
    expect(result.recommendation).toBe('reject');
  });
});
```

---

## Quick Reference

### API Endpoints
- `POST /api/v1/verify` - Start verification
- `GET /api/v1/verify/:id` - Check status
- `GET /api/v1/stats` - Get statistics
- `POST /api/v1/webhooks` - Configure webhooks
- `GET /health` - Health check

### Environment Variables
```bash
DATABASE_URL=postgresql://user:pass@localhost:5432/rwaswift
REDIS_URL=redis://localhost:6379
PERSONA_API_KEY=persona_live_...
STRIPE_SECRET_KEY=sk_live_...
JWT_SECRET=your-secret-key
```

### Performance Targets
- API Response: <200ms p95
- Verification Time: <120 seconds
- Uptime: 99.9%
- Auto-approval Rate: >95%

---

**Ready to build? Start with the verification endpoint and work your way through!** 🚀

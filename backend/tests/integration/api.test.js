/**
 * Integration Tests for API Endpoints
 */

const request = require('supertest');

// Mock the config to avoid database connection during tests
jest.mock('../../src/config/supabase', () => ({
  testConnection: jest.fn().mockResolvedValue(true),
  organizations: {
    findByEmail: jest.fn(),
    create: jest.fn()
  }
}));

// Import app after mocking
const app = require('../../server');

describe('API Integration Tests', () => {
  describe('Health Check', () => {
    test('GET /health should return 200', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('healthy');
      expect(response.body.environment).toBe('test');
    });
  });

  describe('Root Endpoint', () => {
    test('GET / should return API info', async () => {
      const response = await request(app).get('/');
      
      expect(response.status).toBe(200);
      expect(response.body.message).toContain('RWAswift API');
      expect(response.body.version).toBeDefined();
      expect(response.body.status).toBe('operational');
    });
  });

  describe('Error Handling', () => {
    test('should return 404 for non-existent endpoint', async () => {
      const response = await request(app).get('/api/v1/nonexistent');
      
      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('not found');
      expect(response.body.error.statusCode).toBe(404);
    });

    test('should include requestId in error response', async () => {
      const response = await request(app).get('/api/v1/nonexistent');
      
      expect(response.body.error.requestId).toBeDefined();
      expect(typeof response.body.error.requestId).toBe('string');
    });
  });

  describe('CORS Headers', () => {
    test('should include CORS headers', async () => {
      const response = await request(app)
        .get('/health')
        .set('Origin', 'http://localhost:3000');
      
      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });
  });

  describe('Security Headers', () => {
    test('should include security headers', async () => {
      const response = await request(app).get('/health');
      
      expect(response.headers['x-content-type-options']).toBe('nosniff');
      expect(response.headers['x-frame-options']).toBeDefined();
    });
  });
});

describe('Authentication Endpoints', () => {
  describe('POST /api/v1/auth/register', () => {
    test('should reject registration without required fields', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });

    test('should reject invalid email format', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test Company',
          email: 'invalid-email',
          password: 'SecurePass123!'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('INVALID_EMAIL');
    });

    test('should reject weak password', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({
          name: 'Test Company',
          email: 'test@example.com',
          password: 'weak'
        });
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('WEAK_PASSWORD');
    });
  });

  describe('POST /api/v1/auth/login', () => {
    test('should reject login without credentials', async () => {
      const response = await request(app)
        .post('/api/v1/auth/login')
        .send({});
      
      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });
});

describe('Verification Endpoints', () => {
  describe('POST /api/v1/verify', () => {
    test('should reject request without API key', async () => {
      const response = await request(app)
        .post('/api/v1/verify')
        .send({
          email: 'investor@example.com'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('MISSING_API_KEY');
    });

    test('should reject invalid API key format', async () => {
      const response = await request(app)
        .post('/api/v1/verify')
        .set('X-API-Key', 'invalid-key')
        .send({
          email: 'investor@example.com'
        });
      
      expect(response.status).toBe(401);
      expect(response.body.error.code).toBe('INVALID_API_KEY_FORMAT');
    });
  });
});

// Cleanup
afterAll((done) => {
  // Close server connections if any
  done();
});


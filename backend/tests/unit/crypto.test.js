/**
 * Unit Tests for Crypto Utilities
 */

const {
  hashPassword,
  comparePassword,
  generateApiKey,
  generateApiSecret,
  signToken,
  verifyToken
} = require('../../src/utils/crypto');

describe('Crypto Utilities', () => {
  describe('Password Hashing', () => {
    test('should hash a password', async () => {
      const password = 'SecurePassword123!';
      const hash = await hashPassword(password);
      
      expect(hash).toBeDefined();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(50);
    });

    test('should compare password successfully', async () => {
      const password = 'SecurePassword123!';
      const hash = await hashPassword(password);
      const isValid = await comparePassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    test('should fail with wrong password', async () => {
      const password = 'SecurePassword123!';
      const hash = await hashPassword(password);
      const isValid = await comparePassword('WrongPassword', hash);
      
      expect(isValid).toBe(false);
    });
  });

  describe('API Key Generation', () => {
    test('should generate API key with prefix', () => {
      const apiKey = generateApiKey('rwa_');
      
      expect(apiKey).toBeDefined();
      expect(apiKey).toMatch(/^rwa_[a-f0-9]{64}$/);
    });

    test('should generate unique API keys', () => {
      const key1 = generateApiKey();
      const key2 = generateApiKey();
      
      expect(key1).not.toBe(key2);
    });
  });

  describe('API Secret Generation', () => {
    test('should generate API secret', () => {
      const secret = generateApiSecret();
      
      expect(secret).toBeDefined();
      expect(secret.length).toBe(64);
      expect(secret).toMatch(/^[a-f0-9]{64}$/);
    });

    test('should generate unique secrets', () => {
      const secret1 = generateApiSecret();
      const secret2 = generateApiSecret();
      
      expect(secret1).not.toBe(secret2);
    });
  });

  describe('JWT Tokens', () => {
    test('should sign and verify token', () => {
      const payload = {
        orgId: 'test-org-123',
        email: 'test@example.com',
        plan: 'starter'
      };

      const token = signToken(payload);
      
      expect(token).toBeDefined();
      expect(typeof token).toBe('string');

      const decoded = verifyToken(token);
      
      expect(decoded.orgId).toBe(payload.orgId);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.plan).toBe(payload.plan);
    });

    test('should throw error on invalid token', () => {
      const invalidToken = 'invalid.token.here';
      
      expect(() => verifyToken(invalidToken)).toThrow();
    });

    test('should include standard JWT claims', () => {
      const payload = { orgId: 'test-123' };
      const token = signToken(payload);
      const decoded = verifyToken(token);
      
      expect(decoded.iat).toBeDefined(); // issued at
      expect(decoded.exp).toBeDefined(); // expiry
      expect(decoded.aud).toBe('rwaswift-api');
      expect(decoded.iss).toBe('rwaswift');
    });
  });
});


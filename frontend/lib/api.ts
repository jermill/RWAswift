/**
 * RWAswift API Client
 * Handles all API requests to the backend
 */

import axios, { AxiosInstance, AxiosError } from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

class RWAswiftAPI {
  private client: AxiosInstance;

  constructor(apiKey?: string) {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
        ...(apiKey && { 'X-API-Key': apiKey }),
      },
      timeout: 30000,
    });

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        if (error.response) {
          // Server responded with error
          console.error('API Error:', error.response.data);
        } else if (error.request) {
          // Request made but no response
          console.error('Network Error:', error.message);
        }
        return Promise.reject(error);
      }
    );
  }

  // Authentication
  async register(data: {
    name: string;
    email: string;
    password: string;
    website?: string;
  }) {
    const response = await this.client.post('/auth/register', data);
    return response.data;
  }

  async login(email: string, password: string) {
    const response = await this.client.post('/auth/login', { email, password });
    return response.data;
  }

  async refreshToken(refreshToken: string) {
    const response = await this.client.post('/auth/refresh', { refreshToken });
    return response.data;
  }

  async getMe(token: string) {
    const response = await this.client.get('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data;
  }

  // Verification
  async createVerification(data: {
    email: string;
    firstName?: string;
    lastName?: string;
    country?: string;
    dateOfBirth?: string;
  }) {
    const response = await this.client.post('/verify', data);
    return response.data;
  }

  async getVerification(id: string) {
    const response = await this.client.get(`/verify/${id}`);
    return response.data;
  }

  async listVerifications(params?: {
    status?: string;
    limit?: number;
    offset?: number;
    email?: string;
    country?: string;
  }) {
    const response = await this.client.get('/verify', { params });
    return response.data;
  }

  async getStats() {
    const response = await this.client.get('/verify/stats');
    return response.data;
  }

  // Webhooks
  async createWebhook(data: {
    url: string;
    events: string[];
    description?: string;
  }) {
    const response = await this.client.post('/webhooks', data);
    return response.data;
  }

  async listWebhooks() {
    const response = await this.client.get('/webhooks');
    return response.data;
  }

  async deleteWebhook(id: string) {
    const response = await this.client.delete(`/webhooks/${id}`);
    return response.data;
  }

  async testWebhook(id: string) {
    const response = await this.client.post(`/webhooks/${id}/test`);
    return response.data;
  }
}

// Export singleton instance
export const api = new RWAswiftAPI();

// Export class for custom instances
export default RWAswiftAPI;

// Types
export interface VerificationResponse {
  verification: {
    id: string;
    status: 'pending' | 'processing' | 'approved' | 'rejected';
    investor: {
      email: string;
      firstName?: string;
      lastName?: string;
      country?: string;
    };
    risk: {
      score: number;
      level: 'low' | 'medium' | 'high';
      reasons: string[];
    };
    decision: {
      result: 'approved' | 'rejected' | null;
      reason: string | null;
      madeAt: string | null;
      madeBy: string;
    };
    processing: {
      startedAt: string | null;
      completedAt: string | null;
      timeMs: number | null;
    };
    createdAt: string;
    updatedAt: string;
  };
}

export interface StatsResponse {
  stats: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    approvalRate: number | null;
    avgProcessingTime: number | null;
    riskDistribution: {
      low: number;
      medium: number;
      high: number;
    };
  };
  usage: {
    monthly: number;
    limit: number;
    remaining: number;
    percentage: number;
  };
}


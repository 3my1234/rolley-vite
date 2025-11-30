// API Base URL configuration
// In production (Coolify), use the production backend URL
// In development, use localhost
const getApiBaseUrl = () => {
  // If explicitly set via env var, use that
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // If we're on the production domain, use production backend
  if (typeof window !== 'undefined' && window.location.hostname.includes('useguidr.com')) {
    return 'https://qwoo0wg80000ccg4gs8w0wc0.useguidr.com';
  }
  
  // Otherwise, use localhost for development
  return 'http://localhost:3001';
};

const API_BASE_URL = getApiBaseUrl();

// Debug: log the API URL being used (only in development)
if (import.meta.env.DEV) {
  console.log('🔧 API Base URL:', API_BASE_URL);
}

class ApiClient {
  private baseUrl: string;

  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const url = `${this.baseUrl}${endpoint}`;

    const headers = new Headers(options.headers || {});
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const isBrowser = typeof window !== 'undefined';
    const adminToken =
      isBrowser ? window.sessionStorage.getItem('adminToken') : null;

    const shouldAttachAdminToken =
      adminToken &&
      !headers.has('Authorization') &&
      (endpoint.startsWith('/admin') || endpoint.startsWith('/auth/admin'));

    if (shouldAttachAdminToken && adminToken) {
      headers.set('Authorization', `Bearer ${adminToken}`);
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      let errorMessage = `API Error: ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        // NestJS returns errors with 'message' field, not 'error'
        if (errorData.message) {
          errorMessage = errorData.message;
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
      } catch (e) {
        // If we can't parse the error response, use the default message
      }
      
      const error = new Error(errorMessage);
      (error as any).response = { data: { error: errorMessage } };
      throw error;
    }

    const result = await response.json();
    
    // Handle wrapped response from TransformInterceptor
    if (result.data !== undefined) {
      return result.data;
    }
    
    return result;
  }

  // Auth endpoints
  async register(data: any) {
    return this.request('/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
  }

  async syncUser(token: string) {
    return this.request('/auth/sync', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // User endpoints
  async getUserProfile(token: string) {
    return this.request('/users/me', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async updateUserProfile(data: any, token: string) {
    return this.request('/users/me', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }

  // Stakes endpoints
  async createStake(data: any, token: string) {
    return this.request('/stakes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }

  async getUserStakes(token: string) {
    return this.request('/stakes', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async participateInStake(stakeId: string, token: string) {
    return this.request(`/stakes/${stakeId}/participate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
    });
  }

        // Transactions endpoints
  async getUserTransactions(token: string, filter?: string) {
    const url = filter ? `/transactions?filter=${filter}` : '/transactions';
    return this.request(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // Tokens endpoints
  async getUserTokens(token: string) {
    return this.request('/tokens/balance', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  async getTokenRates() {
    return this.request('/tokens/rates', {
      method: 'GET',
    });
  }

  async tradeRol(data: { type: 'BUY' | 'SELL'; currency: 'USD' | 'USDT'; amount: number }, token: string) {
    return this.request('/tokens/trade', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }

  // Daily events endpoints
  async getCurrentEvents(token: string) {
    return this.request('/daily-events/current', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // Wallet endpoints
  async depositFunds(data: any, token: string) {
    return this.request('/wallet/deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }

  async withdrawFunds(data: any, token: string) {
    return this.request('/wallet/withdraw', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }

  async verifyCryptoDeposit(data: any, token: string) {
    return this.request('/wallet/verify-deposit', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
  }

  // Milestone cards endpoints
  async getUserMilestoneCards(token: string) {
    return this.request('/users/milestone-cards', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
  }

  // Payment verification endpoint
  async verifyPayment(transactionId: string, txRef: string, status: string) {
    return this.request(`/webhooks/flutterwave/verify?transaction_id=${transactionId}&tx_ref=${txRef}&status=${status}`);
  }

  // Admin endpoints (if user is admin)
  async getAdminStats() {
    return this.request('/admin/stats', {
      credentials: 'include',
    });
  }

  async getAdminUsers() {
    return this.request('/admin/users', {
      credentials: 'include',
    });
  }

  async getAdminPendingEvents() {
    return this.request('/admin/review-event', {
      credentials: 'include',
    });
  }

  async generateDailyPicks(footballAiData?: any) {
    const isBrowser = typeof window !== 'undefined';
    const adminToken = isBrowser ? window.sessionStorage.getItem('adminToken') : null;
    
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    
    if (adminToken) {
      headers['Authorization'] = `Bearer ${adminToken}`;
    }
    
    return this.request('/ai/generate-daily-picks', {
      method: 'POST',
      credentials: 'include',
      headers,
      body: JSON.stringify({ footballAiData }),
    });
  }

  // AI endpoints
  async getSafePicks() {
    return this.request('/ai/safe-picks', {
      method: 'GET',
    });
  }

  async getRawPredictions() {
    return this.request('/ai/raw-predictions', {
      method: 'GET',
    });
  }

  async getTodayMatches() {
    return this.request('/ai/matches/today', {
      method: 'GET',
    });
  }

  async reviewAdminEvent(data: {
    eventId: string;
    adminPredictions?: any[];
    adminComments?: string;
    approved?: boolean;
  }) {
    return this.request('/admin/review-event', {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify(data),
    });
  }

  async getAdminTopStakers(limit = 10) {
    return this.request(`/admin/top-stakers?limit=${limit}`, {
      credentials: 'include',
    });
  }

  async adminLogin(data: { email: string; password: string }) {
    return this.request('/auth/admin/login', {
      method: 'POST',
      body: JSON.stringify(data),
      credentials: 'include',
    });
  }

  async adminLogout() {
    return this.request('/auth/admin/logout', {
      method: 'POST',
      credentials: 'include',
    });
  }

  async adminSession() {
    return this.request('/auth/admin/session', {
      credentials: 'include',
    });
  }

  async updateEventResult(eventId: string, status: string, result?: string) {
    return this.request(`/admin/daily-event/${eventId}/result`, {
      method: 'POST',
      credentials: 'include',
      body: JSON.stringify({ status, result }),
    });
  }

  async getAdminHistory(limit = 50) {
    return this.request(`/admin/history?limit=${limit}`, {
      credentials: 'include',
    });
  }

  async getUserHistory(token?: string) {
    try {
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const response = await this.request<any>('/daily-events/history', {
        credentials: 'include',
        headers,
      });
      
      // Ensure we always return an array
      if (Array.isArray(response)) {
        return { history: response, success: true };
      } else if (response?.history && Array.isArray(response.history)) {
        return { history: response.history, success: response.success ?? true };
      } else if (response?.data?.history && Array.isArray(response.data.history)) {
        return { history: response.data.history, success: true };
      } else if (response?.data && Array.isArray(response.data)) {
        return { history: response.data, success: true };
      }
      
      // Default to empty array
      return { history: [], success: true };
    } catch (error) {
      console.error('getUserHistory API error:', error);
      // Return empty array on error
      return { history: [], success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  }
}

export const apiClient = new ApiClient();

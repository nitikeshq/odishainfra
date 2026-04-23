const API_BASE = import.meta.env.DEV ? '/api' : 'https://api.odishainfra.com/api';

class AdminApiClient {
  private token: string | null = localStorage.getItem('admin_token');

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('admin_token', token);
    } else {
      localStorage.removeItem('admin_token');
    }
  }

  getToken() {
    return this.token;
  }

  private async request(endpoint: string, options: RequestInit = {}) {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };
    if (this.token) headers['Authorization'] = `Bearer ${this.token}`;

    const res = await fetch(`${API_BASE}${endpoint}`, { ...options, headers });
    const data = await res.json();

    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  }

  // Auth
  sendOtp(identifier: string) {
    return this.request('/auth/send-otp', { method: 'POST', body: JSON.stringify({ identifier }) });
  }
  verifyOtp(identifier: string, code: string) {
    return this.request('/auth/verify-otp', { method: 'POST', body: JSON.stringify({ identifier, code }) });
  }
  getMe() {
    return this.request('/auth/me');
  }

  // Dashboard
  getAdminDashboard() {
    return this.request('/admin/dashboard');
  }

  // Leads
  getLeads(params?: Record<string, string>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/admin/leads${q}`);
  }
  updateLead(id: string, data: { status: string; notes?: string }) {
    return this.request(`/admin/leads/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  // KYC
  getKyc(params?: Record<string, string>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/admin/kyc${q}`);
  }
  updateKyc(id: string, data: { status: string; rejectionReason?: string; reviewNotes?: string }) {
    return this.request(`/admin/kyc/${id}`, { method: 'PUT', body: JSON.stringify({ status: data.status, reviewNotes: data.rejectionReason || data.reviewNotes }) });
  }

  // Listings
  getListings(params?: Record<string, string>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/admin/listings${q}`);
  }
  updateListing(id: string, data: Record<string, unknown>) {
    return this.request(`/admin/listings/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  // Users
  getUsers(params?: Record<string, string>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/admin/users${q}`);
  }
  updateUser(id: string, data: { isBlocked?: boolean }) {
    return this.request(`/admin/users/${id}`, { method: 'PUT', body: JSON.stringify(data) });
  }

  // Push Notifications
  sendPushNotification(data: { title: string; body: string; targetRole?: string; data?: Record<string, unknown> }) {
    return this.request('/admin/notifications/push', { method: 'POST', body: JSON.stringify(data) });
  }
  getPushCampaigns() {
    return this.request('/admin/notifications/campaigns');
  }

  // Analytics
  getAnalytics(params?: Record<string, string>) {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return this.request(`/admin/analytics${q}`);
  }

  // Settings
  getSettings() {
    return this.request('/admin/settings');
  }
  updateSettings(data: Record<string, unknown>) {
    return this.request('/admin/settings', { method: 'PUT', body: JSON.stringify(data) });
  }

  // Subscription plans
  getSubscriptionPlans() {
    return this.request('/subscriptions/plans');
  }
}

export const adminApi = new AdminApiClient();

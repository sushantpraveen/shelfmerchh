/**
 * Minimal API client for Shopify Dashboard
 * Handles token retrieval, error handling, and standard fetch configuration.
 */

const getCookie = (name: string): string | null => {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift() || null;
  return null;
};

const getToken = (): string | null => {
  // Ordered fallback: localStorage -> cookie
  return (
    localStorage.getItem('token') ||
    localStorage.getItem('jwt') ||
    getCookie('token') ||
    getCookie('jwt')
  );
};

export class ApiClientError extends Error {
  constructor(public message: string, public status: number, public data?: any) {
    super(message);
    this.name = 'ApiClientError';
  }
}

export const apiClient = {
  async fetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    
    // Ensure endpoint starts with /api if it doesn't already
    const url = endpoint.startsWith('http') 
      ? endpoint 
      : endpoint.startsWith('/api') 
        ? endpoint 
        : `/api${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'ngrok-skip-browser-warning': 'true',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include', // Important for cookies (XSRF, session, etc.)
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiClientError(
        data.message || `Request failed with status ${response.status}`,
        response.status,
        data
      );
    }

    return data as T;
  },

  get<T = any>(endpoint: string, options: RequestInit = {}) {
    return this.fetch<T>(endpoint, { ...options, method: 'GET' });
  },

  post<T = any>(endpoint: string, body?: any, options: RequestInit = {}) {
    return this.fetch<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  patch<T = any>(endpoint: string, body?: any, options: RequestInit = {}) {
    return this.fetch<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  },

  delete<T = any>(endpoint: string, options: RequestInit = {}) {
    return this.fetch<T>(endpoint, { ...options, method: 'DELETE' });
  },
};

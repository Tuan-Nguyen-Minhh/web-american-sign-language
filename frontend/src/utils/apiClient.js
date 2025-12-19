import API_BASE_URL from '../config/api';
import { authService } from '../services/authService';

/**
 * Enhanced fetch with automatic token refresh on 401
 * Usage: await apiClient('/api/users', { method: 'GET' })
 */
export async function apiClient(endpoint, options = {}) {
  const token = authService.getToken();
  
  // Add auth header if token exists
  const headers = {
    ...options.headers,
  };
  
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  
  // Make the request
  let response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });
  
  // If 401 and we have a refresh token, try to refresh and retry
  if (response.status === 401) {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (refreshToken) {
      console.log('Got 401, attempting token refresh...');
      const newToken = await authService.refreshToken();
      
      if (newToken) {
        // Retry the original request with new token
        headers['Authorization'] = `Bearer ${newToken}`;
        response = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers,
        });
      }
    }
  }
  
  return response;
}

/**
 * Convenience method for GET requests
 */
export async function apiGet(endpoint) {
  return apiClient(endpoint, { method: 'GET' });
}

/**
 * Convenience method for POST requests
 */
export async function apiPost(endpoint, data) {
  return apiClient(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

/**
 * Convenience method for PATCH requests
 */
export async function apiPatch(endpoint, data) {
  return apiClient(endpoint, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  });
}

/**
 * Convenience method for DELETE requests
 */
export async function apiDelete(endpoint) {
  return apiClient(endpoint, { method: 'DELETE' });
}

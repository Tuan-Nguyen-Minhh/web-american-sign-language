import API_BASE_URL from '../config/api';
import { authService } from './authService';

class ApiService {
  async request(endpoint, options = {}) {
    const token = authService.getToken();
    
    const config = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      let response = await fetch(`${API_BASE_URL}${endpoint}`, config);

      // If 401, try to refresh token and retry
      if (response.status === 401) {
        const refreshToken = localStorage.getItem('refresh_token');
        
        if (refreshToken) {
          const newToken = await authService.refreshToken();
          
          if (newToken) {
            // Retry with new token
            config.headers['Authorization'] = `Bearer ${newToken}`;
            response = await fetch(`${API_BASE_URL}${endpoint}`, config);
          } else {
            // Refresh failed, logout
            authService.logout();
            throw new Error('Session expired. Please login again.');
          }
        } else {
          // No refresh token, logout
          authService.logout();
          throw new Error('Session expired. Please login again.');
        }
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Request failed');
      }

      // Handle 204 No Content
      if (response.status === 204) {
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('API request error:', error);
      throw error;
    }
  }
  
  // User endpoints
  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async getUser(userId) {
    return this.request(`/user/${userId}`);
  }

  // Hand Detection endpoints
  async detectHandsFromBase64(base64Image) {
    return this.request('/detection/detect-base64', {
      method: 'POST',
      body: JSON.stringify({ image: base64Image }),
    });
  }

  async detectHandsFromFile(file) {
    const formData = new FormData();
    formData.append('file', file);
    
    const token = authService.getToken();
    const config = {
      method: 'POST',
      body: formData,
      headers: {}
    };

    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/detection/detect-frame`, config);
      
      if (response.status === 401) {
        authService.logout();
        throw new Error('Session expired. Please login again.');
      }

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Detection failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Detection API error:', error);
      throw error;
    }
  }
}

export default new ApiService();
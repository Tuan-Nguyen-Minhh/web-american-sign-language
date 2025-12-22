import API_BASE_URL from '../config/api';

// Global variable to track ongoing refresh request
let isRefreshing = false;
let refreshSubscribers = [];

// Notify all subscribers when refresh completes
function onRefreshed(token) {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
}

// Add subscriber to be notified when refresh completes
function addRefreshSubscriber(callback) {
  refreshSubscribers.push(callback);
}

export const authService = {
  async login(username, password) {
    try {
      console.log('Attempting login with:', { username });

      // IMPORTANT: Backend expects form data (OAuth2PasswordRequestForm)
      // Not JSON!
      const formData = new URLSearchParams();
      formData.append('username', username);
      formData.append('password', password);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded', // Changed from 'application/json'
        },
        credentials: 'include',
        body: formData, // Changed from JSON.stringify()
      });

      console.log('Login response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('Login error response:', error);
        throw new Error(error.detail || 'Invalid credentials');
      }

      const data = await response.json();
      console.log('Login successful');
      
      // Store tokens and user info
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      return data;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  async register(username, email, password) {
    try {
      console.log('Attempting registration...');
      
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, email, password }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Registration failed');
      }

      return await response.json();
    } catch (error) {
      console.error('Registration error:', error);
      throw error;
    }
  },

  logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user');
    window.location.href = '/login';
  },

  getToken() {
    return localStorage.getItem('access_token');
  },

  getUser() {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  updateUserCache(userData) {
    const currentUser = this.getUser();
    const updatedUser = {
      ...currentUser,
      ...userData
    };
    localStorage.setItem('user', JSON.stringify(updatedUser));
  },

  isAuthenticated() {
    return !!this.getToken();
  },

  // Refresh access token using refresh token
  async refreshToken() {
    const refreshToken = localStorage.getItem('refresh_token');
    
    if (!refreshToken) {
      return null;
    }

    // If already refreshing, wait for the ongoing refresh to complete
    if (isRefreshing) {
      console.log('⏳ Token refresh in progress, waiting...');
      return new Promise((resolve) => {
        addRefreshSubscriber((token) => {
          resolve(token);
        });
      });
    }

    isRefreshing = true;
    console.log('🔄 Refreshing token...');

    try {
      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ refresh_token: refreshToken })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Token refresh failed:', response.status, errorData.detail);
        isRefreshing = false;
        onRefreshed(null);
        
        // Only logout if it's a 401 (invalid/expired refresh token)
        // For other errors, let the user try again
        if (response.status === 401) {
          this.logout();
        }
        return null;
      }

      const data = await response.json();
      console.log('✅ Token refreshed successfully');
      
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('refresh_token', data.refresh_token);
      
      isRefreshing = false;
      onRefreshed(data.access_token);
      
      return data.access_token;
    } catch (error) {
      console.error('❌ Token refresh error:', error.message);
      isRefreshing = false;
      onRefreshed(null);
      // Only logout on network errors, not on expected API failures
      // this.logout();
      return null;
    }
  },

  // Verify if token is still valid by calling /me endpoint
  async verifyToken() {
    const token = this.getToken();
    if (!token) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        // Try to refresh token before logging out
        console.log('Access token expired, attempting refresh...');
        const newToken = await this.refreshToken();
        return !!newToken;
      }

      // Token is valid, update user cache with fresh data
      const userData = await response.json();
      this.updateUserCache(userData);
      return true;
    } catch (error) {
      console.error('Token verification failed:', error);
      // Try refresh as last resort
      const newToken = await this.refreshToken();
      return !!newToken;
    }
  },

  // Guest login - no credentials required
  async guestLogin() {
    try {
      console.log('Attempting guest login...');

      const response = await fetch(`${API_BASE_URL}/auth/guest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      console.log('Guest login response status:', response.status);

      if (!response.ok) {
        const error = await response.json();
        console.error('Guest login error response:', error);
        throw new Error(error.detail || 'Guest login failed');
      }

      const data = await response.json();
      console.log('Guest login successful');
      
      // Store token and user info (no refresh token for guests)
      localStorage.setItem('access_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      return data;
    } catch (error) {
      console.error('Guest login error:', error);
      throw error;
    }
  },

  // Check if current user is a guest
  isGuest() {
    const user = this.getUser();
    return user?.role === 'guest';
  }
};
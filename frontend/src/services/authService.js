import API_BASE_URL from '../config/api';

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
      
      // Store token and user info
      localStorage.setItem('access_token', data.access_token);
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
  }
};
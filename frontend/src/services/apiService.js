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
      const response = await fetch(`${API_BASE_URL}${endpoint}`, config);

      if (response.status === 401) {
        authService.logout();
        throw new Error('Session expired. Please login again.');
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

  // Blog endpoints
  async getBlogs() {
    return this.request('/blog');
  }

  async getBlog(blogId) {
    return this.request(`/blog/${blogId}`);
  }

  async createBlog(blogData) {
    return this.request('/blog', {
      method: 'POST',
      body: JSON.stringify(blogData),
    });
  }

  async updateBlog(blogId, blogData) {
    return this.request(`/blog/${blogId}`, {
      method: 'PUT',
      body: JSON.stringify(blogData),
    });
  }

  async deleteBlog(blogId) {
    return this.request(`/blog/${blogId}`, {
      method: 'DELETE',
    });
  }

  // User endpoints
  async getCurrentUser() {
    return this.request('/auth/me');
  }

  async getUser(userId) {
    return this.request(`/user/${userId}`);
  }
}

export default new ApiService();

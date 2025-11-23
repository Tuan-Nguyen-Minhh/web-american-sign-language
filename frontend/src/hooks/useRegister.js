import { useState } from 'react';
import { authService } from '../services/authService';

export const useRegister = (loginLink) => {
  const [registerData, setRegisterData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [registerError, setRegisterError] = useState('');
  const [registerLoading, setRegisterLoading] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState(false);

  const handleRegisterChange = (e) => {
    setRegisterData({
      ...registerData,
      [e.target.name]: e.target.value
    });
    setRegisterError('');
  };

  const handleRegisterSubmit = async (e) => {
    e.preventDefault();
    setRegisterError('');
    
    // Check if passwords match
    if (registerData.password !== registerData.confirmPassword) {
      setRegisterError('Passwords do not match!');
      return;
    }
    
    // Check password length
    if (registerData.password.length < 6) {
      setRegisterError('Password must be at least 6 characters long!');
      return;
    }
    
    setRegisterLoading(true);

    try {
      await authService.register(
        registerData.username,
        registerData.email,
        registerData.password
      );
      
      setRegisterSuccess(true);
      
      // Clear form
      setRegisterData({
        username: '',
        email: '',
        password: '',
        confirmPassword: ''
      });
      
      // Switch to login after 2 seconds
      setTimeout(() => {
        loginLink();
      }, 2000);
      
    } catch (error) {
      // FIX: Properly extract error message
      console.error('Registration error:', error);
      
      let errorMessage = 'Registration failed. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error.detail) {
        errorMessage = error.detail;
      }
      
      setRegisterError(errorMessage);
    } finally {
      setRegisterLoading(false);
    }
  };

  return {
    registerData,
    registerError,
    registerLoading,
    registerSuccess,
    handleRegisterChange,
    handleRegisterSubmit
  };
};

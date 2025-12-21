import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

export const useLogin = () => {
  const navigate = useNavigate();
  
  const [loginData, setLoginData] = useState({
    username: '',
    password: ''
  });
  
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLoginChange = (e) => {
    setLoginData({
      ...loginData,
      [e.target.name]: e.target.value
    });
    setLoginError(''); // Clear error when user types
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    try {
      await authService.login(loginData.username, loginData.password);
      navigate('/');
    } catch (error) {
      // FIX: Properly extract error message
      console.error('Login error:', error);
      
      let errorMessage = 'Login failed. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error.detail) {
        errorMessage = error.detail;
      }
      
      setLoginError(errorMessage);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoginError('');
    setLoginLoading(true);

    try {
      await authService.guestLogin();
      navigate('/');
    } catch (error) {
      console.error('Guest login error:', error);
      
      let errorMessage = 'Guest login failed. Please try again.';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      } else if (error.detail) {
        errorMessage = error.detail;
      }
      
      setLoginError(errorMessage);
    } finally {
      setLoginLoading(false);
    }
  };

  return {
    loginData,
    loginError,
    loginLoading,
    handleLoginChange,
    handleLoginSubmit,
    handleGuestLogin
  };
};
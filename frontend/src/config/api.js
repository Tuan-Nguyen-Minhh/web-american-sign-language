const isDevelopment = import.meta.env.DEV;

const RENDER_BACKEND_HOST = 'web-american-sign-language.onrender.com';

export const API_BASE_URL = import.meta.env.VITE_API_URL || (isDevelopment 
  ? 'http://localhost:8000/api'
  : `https://${RENDER_BACKEND_HOST}/api`);

export const getWebSocketUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  if (isDevelopment) {
    return 'ws://localhost:8000/api/detection/ws';
  }
  return `wss://${RENDER_BACKEND_HOST}/api/detection/ws`;
};

export default API_BASE_URL;
const isDevelopment = import.meta.env.DEV;

export const API_BASE_URL = import.meta.env.VITE_API_URL || (isDevelopment 
  ? 'http://localhost:8000/api'
  : '/api');

export const getWebSocketUrl = () => {
  if (import.meta.env.VITE_WS_URL) {
    return import.meta.env.VITE_WS_URL;
  }
  if (typeof window !== 'undefined') {
    if (isDevelopment) {
      return 'ws://localhost:8000/api/detection/ws';
    }
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${protocol}//${window.location.host}/api/detection/ws`;
  }
  return 'ws://localhost:8000/api/detection/ws';
};

export default API_BASE_URL;
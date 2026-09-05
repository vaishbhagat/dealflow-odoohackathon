import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor: attach auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('dealflow_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: extract response data & handle errors cleanly
api.interceptors.response.use(
  (response) => response.data,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Clear token if unauthorized
      if (window.location.pathname !== '/login') {
        localStorage.removeItem('dealflow_token');
      }
    }
    
    const data = error.response?.data;
    const message = data?.message || data?.error || data?.details || error.message || 'An unexpected error occurred';
    const normalizedError = new Error(message);
    normalizedError.success = false;
    normalizedError.status = error.response?.status;
    normalizedError.errorCode = data?.errorCode;
    normalizedError.details = data?.details;
    normalizedError.data = data;

    return Promise.reject(normalizedError);
  }
);

export default api;

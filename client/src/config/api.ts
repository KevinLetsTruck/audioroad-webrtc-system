import axios from 'axios';

// Get API URL from environment variable or default to localhost
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000';

// Create axios instance with default config
export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for authentication (future use)
api.interceptors.request.use(
  (config) => {
    // TODO: Add auth token when authentication is implemented
    // const token = localStorage.getItem('authToken');
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // TODO: Handle unauthorized access
      // window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const endpoints = {
  health: '/api/health',
  callers: '/api/callers',
  calls: '/api/calls',
  readyCalls: '/api/calls/ready',
};
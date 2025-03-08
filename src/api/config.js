import axios from 'axios';

export const API_BASE_URL = import.meta.env.VITE_API_URL;

export const axiosConfig = {
  baseURL: API_BASE_URL,
  timeout: 10000, // Increase timeout
  withCredentials: true
};

// Add axios interceptor for error handling
axios.interceptors.response.use(
  response => response,
  error => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

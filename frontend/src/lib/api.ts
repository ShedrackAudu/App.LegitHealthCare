import axios from 'axios';

// Get the API URL from environment variables (Vite uses VITE_ prefix)
// Fallback to localhost for development
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Attach to window for easy access in templates without explicit imports in every file
(window as any).API_BASE_URL = API_BASE_URL;

// Configure global axios defaults
axios.defaults.baseURL = API_BASE_URL;

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Optional: Add interceptors for tokens if needed later
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

import axios from 'axios';
import { isNetworkError, NETWORK_ERROR_MESSAGE, SERVER_UNREACHABLE_MESSAGE } from './networkError';

// Get the API URL from environment variables (Vite uses VITE_ prefix)
// Fallback to localhost for development
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Attach to window for easy access in templates without explicit imports in every file
(window as any).API_BASE_URL = API_BASE_URL;

// Configure global axios defaults
axios.defaults.baseURL = API_BASE_URL;
axios.defaults.withCredentials = true;

// Re-initialize token on reload for components still using global axios
const token = localStorage.getItem('token');
if (token) {
  axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
}

// -------------------------------------------------------------------
// Global network-error interceptor (on the default axios instance)
// Enriches the error so downstream catch blocks can detect offline/
// server-unreachable situations without duplicating detection logic.
// The NetworkStatusBanner component handles user-facing notifications.
// -------------------------------------------------------------------
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (isNetworkError(error)) {
      const msg = !navigator.onLine
        ? NETWORK_ERROR_MESSAGE
        : SERVER_UNREACHABLE_MESSAGE;
      // Attach a friendly message for downstream catch blocks
      error._isNetworkError = true;
      error._networkMessage = msg;
    }
    return Promise.reject(error);
  }
);

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
});

// Response interceptor for global error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // Detect network errors first
    if (isNetworkError(error)) {
      const msg = !navigator.onLine
        ? NETWORK_ERROR_MESSAGE
        : SERVER_UNREACHABLE_MESSAGE;
      error._isNetworkError = true;
      error._networkMessage = msg;
    }
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login?reason=session_expired';
      }
    }
    return Promise.reject(error);
  }
);

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;

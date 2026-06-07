import axios from 'axios';
import { useAuthStore } from '@/store/authStore';

// For server-side Next.js API routes, use relative path when in browser.
// For direct backend calls (e.g. from components that call /api/* Next routes), 
// always use relative URLs so the Next.js proxy handles auth forwarding.
const API_BASE_URL =
  typeof window !== 'undefined'
    ? '/api' // browser: use Next.js API routes
    : process.env.BACKEND_URL
    ? `${process.env.BACKEND_URL}/api`
    : 'http://localhost:8000/api'; // server-side fallback

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Attach Bearer token from localStorage on every request (client only)
api.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('auth-storage');
      if (raw) {
        const token = JSON.parse(raw)?.state?.token;
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
    } catch {
      // ignore parse errors
    }
  }
  return config;
});

// Global response error handler
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Clear stale auth on 401 (Zustand store + local storage)
      if (typeof window !== 'undefined') {
        useAuthStore.getState().logout();
      }
    }
    return Promise.reject(error);
  }
);

export default api;

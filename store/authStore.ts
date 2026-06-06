import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@/types';

interface AuthStore {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string, role: 'student' | 'teacher') => Promise<void>;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      isLoading: false,
      error: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || errData.error || errData.message || 'Login failed');
          }

          const data = await response.json();
          // Assuming backend returns { access_token, user } or similar.
          // Wait, the backend currently returns TokenSchema(access_token, refresh_token).
          // And there's a /api/auth/me to get the user. Let's adjust this later if needed.
          // The current mock API returns { user }. We should store whatever is passed.
          // Actually, our next.js proxy route will handle formatting or the backend will be updated.
          set({ user: data.user, token: data.access_token || data.token || null, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      register: async (email: string, password: string, name: string, role: 'student' | 'teacher') => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password, name, role }),
          });

          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.detail || errData.error || errData.message || 'Registration failed');
          }

          const data = await response.json();
          set({ user: data.user, token: data.access_token || data.token || null, isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      logout: () => {
        set({ user: null, token: null, error: null });
      },
    }),
    {
      name: 'auth-storage', // key in localStorage
    }
  )
);

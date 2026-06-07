import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { User } from '@/types';

interface AuthStore {
  user: User | null;
  token: string | null;
  remember: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  register: (email: string, password: string, name: string, role: 'student' | 'teacher', remember?: boolean) => Promise<void>;
  logout: () => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      token: null,
      remember: false,
      isLoading: false,
      error: null,

      clearError: () => set({ error: null }),

      login: async (email: string, password: string, remember = false) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim().toLowerCase(), password, remember }),
          });

          const data = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(data.detail || data.error || data.message || 'Login failed');
          }

          set({
            user: data.user ?? null,
            token: data.access_token || data.token || null,
            remember,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error; // re-throw so callers can catch
        }
      },

      register: async (email: string, password: string, name: string, role: 'student' | 'teacher', remember = false) => {
        set({ isLoading: true, error: null });
        try {
          const response = await fetch('/api/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: email.trim().toLowerCase(), password, name: name.trim(), role, remember }),
          });

          const data = await response.json().catch(() => ({}));

          if (!response.ok) {
            throw new Error(data.detail || data.error || data.message || 'Registration failed');
          }

          set({
            user: data.user ?? null,
            token: data.access_token || data.token || null,
            remember,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
          throw error;
        }
      },

      logout: () => {
        set({ user: null, token: null, remember: false, error: null, isLoading: false });
        if (typeof window !== 'undefined') {
          localStorage.removeItem('auth-storage');
          sessionStorage.removeItem('auth-storage');
        }
      },
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => ({
        getItem: (name) => {
          if (typeof window === 'undefined') return null;
          const localValue = localStorage.getItem(name);
          if (localValue) return localValue;
          return sessionStorage.getItem(name);
        },
        setItem: (name, value) => {
          if (typeof window === 'undefined') return;
          try {
            const parsed = JSON.parse(value);
            const remember = parsed.state?.remember;
            if (remember) {
              localStorage.setItem(name, value);
              sessionStorage.removeItem(name);
            } else {
              sessionStorage.setItem(name, value);
              localStorage.removeItem(name);
            }
          } catch {
            localStorage.setItem(name, value);
          }
        },
        removeItem: (name) => {
          if (typeof window === 'undefined') return;
          localStorage.removeItem(name);
          sessionStorage.removeItem(name);
        },
      })),
      // Only persist these keys — don't persist loading/error state
      partialize: (state) => ({ user: state.user, token: state.token, remember: state.remember }),
    }
  )
);

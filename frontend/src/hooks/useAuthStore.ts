/**
 * Auth Store (Zustand)
 * Manages wallet connection + JWT session state.
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { api, User } from '../lib/api';

interface AuthState {
  token:   string | null;
  user:    User   | null;
  loading: boolean;

  login:  (token: string, user: User) => void;
  logout: () => void;
  fetchMe: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      token:   null,
      user:    null,
      loading: false,

      login: (token, user) => {
        if (typeof window !== 'undefined') {
          localStorage.setItem('am_token', token);
        }
        set({ token, user });
      },

      logout: () => {
        if (typeof window !== 'undefined') {
          localStorage.removeItem('am_token');
        }
        set({ token: null, user: null });
      },

      fetchMe: async () => {
        if (!get().token) return;
        set({ loading: true });
        try {
          const user = await api.getMe();
          set({ user });
        } catch {
          set({ token: null, user: null });
          if (typeof window !== 'undefined') {
            localStorage.removeItem('am_token');
          }
        } finally {
          set({ loading: false });
        }
      },
    }),
    {
      name: 'agentmarket-auth',
      partialize: (state) => ({ token: state.token }),
    }
  )
);

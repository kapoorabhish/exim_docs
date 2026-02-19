import { create } from 'zustand';
import api from './api';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: string;
  phone?: string | null;
  avatarUrl?: string | null;
}

export interface Tenant {
  id: string;
  name: string;
  slug: string;
  status?: string;
}

interface AuthState {
  user: User | null;
  tenant: Tenant | null;
  isAuthenticated: boolean;
  isLoading: boolean;

  setAuth: (user: User, tenant: Tenant, accessToken: string, refreshToken: string) => void;
  logout: () => Promise<void>;
  loadFromStorage: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  tenant: null,
  isAuthenticated: false,
  isLoading: true,

  setAuth: (user, tenant, accessToken, refreshToken) => {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('tenant', JSON.stringify(tenant));
    set({ user, tenant, isAuthenticated: true, isLoading: false });
  },

  logout: async () => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch {
      // ignore logout errors
    }
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    localStorage.removeItem('tenant');
    set({ user: null, tenant: null, isAuthenticated: false, isLoading: false });
  },

  loadFromStorage: () => {
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');
    const tenantStr = localStorage.getItem('tenant');

    if (token && userStr && tenantStr) {
      try {
        const user = JSON.parse(userStr);
        const tenant = JSON.parse(tenantStr);
        set({ user, tenant, isAuthenticated: true, isLoading: false });
      } catch {
        set({ isLoading: false });
      }
    } else {
      set({ isLoading: false });
    }
  },
}));

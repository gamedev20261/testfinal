import axios from 'axios';
import { api } from './client';
import type { User } from '../types/user';

// One function per auth endpoint of the backend (backend/src/modules/auth/auth.routes.ts)
export const authApi = {
  // POST /api/auth/login → the server also sets the session cookie
  async login(email: string, password: string): Promise<User> {
    const { data } = await api.post<{ user: User }>('/auth/login', { email, password });
    return data.user;
  },

  // POST /api/auth/logout → the server deletes the session cookie
  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  // POST /api/auth/change-password → other logins of this user end
  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.post('/auth/change-password', { currentPassword, newPassword });
  },

  // GET /api/auth/me → the logged-in user, or null when nobody is logged in (401)
  async me(): Promise<User | null> {
    try {
      const { data } = await api.get<{ user: User }>('/auth/me');
      return data.user;
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) return null;
      throw error;
    }
  },
};

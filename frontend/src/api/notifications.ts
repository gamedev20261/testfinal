import { api } from './client';
import type { Notification } from '../types/notification';

export const notificationsApi = {
  async list() {
    const { data } = await api.get<{ notifications: Notification[]; unreadCount: number }>('/notifications');
    return data;
  },
  async markRead(id: string) {
    await api.post(`/notifications/${id}/read`);
  },
  async markAllRead() {
    await api.post('/notifications/read-all');
  },
};

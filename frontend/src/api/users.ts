import { api } from './client';
import type { DirectoryUser, Role, UserGroup } from '../types/user';

export type UserInput = { name: string; email: string; password?: string; role: Role; groupId: string | null };

// Admin portal: /api/users and /api/user-groups
export const usersApi = {
  async list() {
    const { data } = await api.get<{ users: DirectoryUser[] }>('/users');
    return data.users;
  },
  async create(input: UserInput) {
    const { data } = await api.post<{ user: DirectoryUser }>('/users', input);
    return data.user;
  },
  async update(id: string, input: Partial<UserInput>) {
    const { data } = await api.patch<{ user: DirectoryUser }>(`/users/${id}`, input);
    return data.user;
  },
  async remove(id: string) {
    await api.delete(`/users/${id}`);
  },

  async listGroups() {
    const { data } = await api.get<{ groups: UserGroup[] }>('/user-groups');
    return data.groups;
  },
  async createGroup(name: string) {
    const { data } = await api.post<{ group: UserGroup }>('/user-groups', { name });
    return data.group;
  },
  async renameGroup(id: string, name: string) {
    await api.patch(`/user-groups/${id}`, { name });
  },
  async removeGroup(id: string) {
    await api.delete(`/user-groups/${id}`);
  },
};

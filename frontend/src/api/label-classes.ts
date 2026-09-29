import { api } from './client';
import type { LabelClass, LabelGroup } from '../types/project';

export type LabelClassInput = { name: string; color: string; groupId: string | null };

// Admin portal: /api/label-classes and /api/label-groups
export const labelClassesApi = {
  async list() {
    const { data } = await api.get<{ labelClasses: LabelClass[] }>('/label-classes');
    return data.labelClasses;
  },
  async create(input: LabelClassInput) {
    const { data } = await api.post<{ labelClass: LabelClass }>('/label-classes', input);
    return data.labelClass;
  },
  async update(id: string, input: Partial<LabelClassInput>) {
    const { data } = await api.patch<{ labelClass: LabelClass }>(`/label-classes/${id}`, input);
    return data.labelClass;
  },
  async remove(id: string) {
    await api.delete(`/label-classes/${id}`);
  },

  async listGroups() {
    const { data } = await api.get<{ groups: LabelGroup[] }>('/label-groups');
    return data.groups;
  },
  async createGroup(name: string) {
    const { data } = await api.post<{ group: LabelGroup }>('/label-groups', { name });
    return data.group;
  },
  async renameGroup(id: string, name: string) {
    await api.patch(`/label-groups/${id}`, { name });
  },
  async removeGroup(id: string) {
    await api.delete(`/label-groups/${id}`);
  },
};

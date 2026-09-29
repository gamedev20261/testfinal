import { api } from './client';
import type { Label, ShapeGeometry } from '../types/label';

// /api/labels/:id: one shape
export const labelsApi = {
  async update(id: string, input: { labelClassId?: string; geometry?: ShapeGeometry }) {
    const { data } = await api.patch<{ label: Label }>(`/labels/${id}`, input);
    return data.label;
  },
  async remove(id: string) {
    await api.delete(`/labels/${id}`);
  },
  async restore(id: string) {
    const { data } = await api.post<{ label: Label }>(`/labels/${id}/restore`);
    return data.label;
  },
  async review(id: string, status: 'APPROVED' | 'REJECTED', comment = '') {
    const { data } = await api.post<{ label: Label }>(`/labels/${id}/review`, { status, comment });
    return data.label;
  },
};

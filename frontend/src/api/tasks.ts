import { api } from './client';
import type { MyTask, Task, TaskDetail } from '../types/task';
import type { Label, ShapeGeometry, ShapeType } from '../types/label';
import type { TaskInput } from './projects';

export type NewLabel = { labelClassId: string; shapeType: ShapeType; geometry: ShapeGeometry };

// /api/tasks: one task, its workflow, and the shapes on its images
export const tasksApi = {
  async mine() {
    const { data } = await api.get<{ tasks: MyTask[] }>('/tasks/mine');
    return data.tasks;
  },
  async get(id: string) {
    const { data } = await api.get<TaskDetail>(`/tasks/${id}`);
    return data;
  },
  async update(id: string, input: Partial<TaskInput>) {
    const { data } = await api.patch<{ task: Task }>(`/tasks/${id}`, input);
    return data.task;
  },
  async remove(id: string) {
    await api.delete(`/tasks/${id}`);
  },

  // Workflow
  async start(id: string) {
    await api.post(`/tasks/${id}/start`);
  },
  async submit(id: string) {
    await api.post(`/tasks/${id}/submit`);
  },
  async review(id: string, result: 'PASSED' | 'FAILED', comment: string) {
    await api.post(`/tasks/${id}/review`, { result, comment });
  },
  async reviewImage(id: string, imageId: string, result: 'APPROVED' | 'REJECTED', comment: string) {
    await api.post(`/tasks/${id}/images/${imageId}/review`, { result, comment });
  },

  // Shapes
  async labels(id: string, imageId: string) {
    const { data } = await api.get<{ labels: Label[] }>(`/tasks/${id}/images/${imageId}/labels`);
    return data.labels;
  },
  async createLabel(id: string, imageId: string, input: NewLabel) {
    const { data } = await api.post<{ label: Label }>(`/tasks/${id}/images/${imageId}/labels`, input);
    return data.label;
  },
  async approveAll(id: string, imageId: string) {
    const { data } = await api.post<{ approved: number }>(`/tasks/${id}/images/${imageId}/labels/approve-all`);
    return data.approved;
  },
};

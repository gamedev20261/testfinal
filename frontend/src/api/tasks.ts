import { api } from './client';
import type { MyTask, Task, TaskDetail } from '../types/task';
import type { Label, PolygonGeometry, Position, ShapeGeometry, ShapeType } from '../types/label';
import type { TaskInput } from './projects';

export type NewLabel = { labelClassId: string; shapeType: ShapeType; geometry: ShapeGeometry };
export type MagicWandInput = { x: number; y: number; tolerance: number; view: [number, number, number, number] };
export type BrushInput = { stroke: Position[]; radius: number; erase: boolean; base?: PolygonGeometry };
// What a brush stroke does: a new shape, a changed or deleted selected shape, or nothing
export type BrushResult = { action: 'create' | 'update'; geometry: PolygonGeometry } | { action: 'delete' | 'none'; geometry?: undefined };

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

  // Segmentation helpers: they return a polygon, which is then saved like a drawn one
  async magicWand(id: string, imageId: string, input: MagicWandInput) {
    const { data } = await api.post<{ geometry: PolygonGeometry }>(`/tasks/${id}/images/${imageId}/magic-wand`, input);
    return data.geometry;
  },
  async brush(id: string, imageId: string, input: BrushInput) {
    const { data } = await api.post<BrushResult>(`/tasks/${id}/images/${imageId}/brush`, input);
    return data;
  },

  async split(id: string, imageId: string, geometry: PolygonGeometry, line: Position[]) {
    const { data } = await api.post<{ pieces: PolygonGeometry[] }>(`/tasks/${id}/images/${imageId}/split`, { geometry, line });
    return data.pieces;
  },
  async merge(id: string, imageId: string, geometries: PolygonGeometry[]) {
    const { data } = await api.post<{ geometry: PolygonGeometry }>(`/tasks/${id}/images/${imageId}/merge`, { geometries });
    return data.geometry;
  },

  async approveAll(id: string, imageId: string) {
    const { data } = await api.post<{ approved: number }>(`/tasks/${id}/images/${imageId}/labels/approve-all`);
    return data.approved;
  },
};

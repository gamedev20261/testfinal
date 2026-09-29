import { api } from './client';
import type { LabelClass, Member, Project, ProjectStats, ProjectSummary, ProjectType, ProjectStatus } from '../types/project';
import type { ProjectImage } from '../types/image';
import type { Task } from '../types/task';

export type CreateProjectInput = { name: string; description: string; type: ProjectType; labelClassIds: string[] };
export type UpdateProjectInput = Partial<{ name: string; description: string; type: ProjectType; status: ProjectStatus }>;
export type TaskInput = { name: string; description: string; annotatorId: string; auditorId: string; imageIds: string[] };
export type ExportFormat = 'YOLO' | 'YOLO_OBB' | 'COCO' | 'GEOJSON' | 'MASKS';
// chipSize 0 = whole images; mergeClasses only matters for MASKS
export type ExportOptions = { format: ExportFormat; chipSize: number; includeImages: boolean; mergeClasses: boolean };

// /api/projects and everything inside one project
export const projectsApi = {
  async list() {
    const { data } = await api.get<{ projects: ProjectSummary[] }>('/projects');
    return data.projects;
  },
  async get(id: string) {
    const { data } = await api.get<{ project: Project }>(`/projects/${id}`);
    return data.project;
  },
  async create(input: CreateProjectInput) {
    const { data } = await api.post<{ project: { id: string } }>('/projects', input);
    return data.project;
  },
  async update(id: string, input: UpdateProjectInput) {
    const { data } = await api.patch<{ project: Project }>(`/projects/${id}`, input);
    return data.project;
  },
  async remove(id: string) {
    await api.delete(`/projects/${id}`);
  },

  // Team
  async members(id: string) {
    const { data } = await api.get<{ members: Member[] }>(`/projects/${id}/members`);
    return data.members;
  },
  async addMembers(id: string, userIds: string[]) {
    await api.post(`/projects/${id}/members`, { userIds });
  },
  async removeMember(id: string, userId: string) {
    await api.delete(`/projects/${id}/members/${userId}`);
  },

  // Label classes used by the project
  async setLabelClasses(id: string, labelClassIds: string[]) {
    const { data } = await api.put<{ labelClasses: LabelClass[] }>(`/projects/${id}/label-classes`, { labelClassIds });
    return data.labelClasses;
  },

  async stats(id: string) {
    const { data } = await api.get<{ stats: ProjectStats }>(`/projects/${id}/stats`);
    return data.stats;
  },

  // Imagery
  async images(id: string) {
    const { data } = await api.get<{ images: ProjectImage[] }>(`/projects/${id}/images`);
    return data.images;
  },
  async upload(id: string, files: File[], onProgress: (percent: number) => void) {
    const form = new FormData();
    files.forEach((file) => form.append('files', file));
    const { data } = await api.post<{ images: ProjectImage[] }>(`/projects/${id}/images`, form, {
      timeout: 0, // big files take a while
      onUploadProgress: (event) => event.total && onProgress(Math.round((event.loaded / event.total) * 100)),
    });
    return data.images;
  },

  // Tasks
  async tasks(id: string) {
    const { data } = await api.get<{ tasks: Task[] }>(`/projects/${id}/tasks`);
    return data.tasks;
  },
  async createTask(id: string, input: TaskInput) {
    const { data } = await api.post<{ task: Task }>(`/projects/${id}/tasks`, input);
    return data.task;
  },

  // Export (tasks that passed review only): the summary first, then the browser downloads the zip from exportUrl
  async exportSummary(id: string) {
    const { data } = await api.get<{ passedTaskCount: number; imageCount: number; labelCount: number }>(`/projects/${id}/export/summary`);
    return data;
  },
  exportUrl(id: string, options: ExportOptions) {
    const params = new URLSearchParams({
      format: options.format,
      chipSize: String(options.chipSize),
      includeImages: String(options.includeImages),
      mergeClasses: String(options.mergeClasses),
    });
    return `/api/projects/${id}/export?${params}`;
  },
};

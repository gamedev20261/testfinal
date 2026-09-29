import type { LabelClass, ProjectType } from './project';
import type { ImageStatus } from './image';

export type TaskStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'SUBMITTED' | 'PASSED' | 'FAILED';
export type ReviewStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type TaskRole = 'ANNOTATOR' | 'AUDITOR' | 'ADMIN';

type Person = { id: string; name: string };

export type Task = {
  id: string;
  projectId: string;
  name: string;
  description: string;
  status: TaskStatus;
  reviewComment: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  annotator: Person;
  auditor: Person;
  imageIds: string[];
  labelCount: number;
  rejectedCount: number;
};

// A row on the "Labeling tasks" page
export type MyTask = Task & {
  project: { id: string; name: string; type: ProjectType };
  myRole: TaskRole;
};

export type TaskImage = {
  id: string;
  originalName: string;
  width: number | null;
  height: number | null;
  status: ImageStatus;
  reviewStatus: ReviewStatus;
  reviewComment: string | null;
  labelCount: number;
  pendingCount: number;
  rejectedCount: number;
};

// GET /api/tasks/:id: everything the editor needs
export type TaskDetail = {
  task: Task;
  project: { id: string; name: string; type: ProjectType };
  myRole: TaskRole;
  images: TaskImage[];
  labelClasses: LabelClass[];
};

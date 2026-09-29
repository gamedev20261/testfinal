export type ProjectType = 'DETECTION' | 'SEGMENTATION';
export type ProjectStatus = 'ACTIVE' | 'ARCHIVED';

export type LabelClass = {
  id: string;
  name: string;
  color: string;
  groupId?: string | null;
  groupName: string | null;
  labelCount?: number;
};

export type LabelGroup = { id: string; name: string };

// A card on the home page
export type ProjectSummary = {
  id: string;
  name: string;
  description: string;
  type: ProjectType;
  status: ProjectStatus;
  createdAt: string;
  imageCount: number;
  taskCount: number;
  labelCount: number;
  lastActivityAt: string;
  thumbnailImageIds: string[];
  annotators: { id: string; name: string }[];
  myTaskId: string | null;
};

export type Project = Omit<ProjectSummary, 'thumbnailImageIds' | 'annotators' | 'myTaskId'> & {
  labelClasses: LabelClass[];
};

export type Member = { id: string; name: string; email: string; role: 'ANNOTATOR' | 'AUDITOR'; addedAt: string };

export type ProjectStats = {
  tasksByStatus: Record<string, number>;
  labelsByReview: Record<string, number>;
  imagesByStatus: Record<string, number>;
  labelsByClass: { id: string; name: string; color: string; count: number }[];
  byAnnotator: { id: string; name: string; labels: number; approved: number; rejected: number }[];
};

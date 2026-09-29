export type ImageStatus = 'UPLOADED' | 'PROCESSING' | 'READY' | 'FAILED';

export type ProjectImage = {
  id: string;
  projectId: string;
  originalName: string;
  sizeBytes: number;
  status: ImageStatus;
  errorMessage: string | null;
  width: number | null;
  height: number | null;
  srid: number | null;
  isGeoreferenced: boolean;
  createdAt: string;
  taskNames: string[];
};

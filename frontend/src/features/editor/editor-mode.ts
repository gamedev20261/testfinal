import type { TaskDetail } from '../../types/task';
import type { ShapeType } from '../../types/label';

// What this user may do in this task right now
export function editorMode({ myRole, task }: TaskDetail) {
  return {
    canEdit: myRole !== 'AUDITOR' && ['NOT_STARTED', 'IN_PROGRESS', 'FAILED'].includes(task.status),
    canReview: myRole !== 'ANNOTATOR' && task.status === 'SUBMITTED',
    isAnnotator: myRole === 'ANNOTATOR' || myRole === 'ADMIN',
    isAuditor: myRole === 'AUDITOR' || myRole === 'ADMIN',
  };
}

export type EditorMode = ReturnType<typeof editorMode>;

// Drawing tools per project type, with their keyboard key
export const TOOLS_BY_TYPE: Record<'DETECTION' | 'SEGMENTATION', ShapeType[]> = {
  DETECTION: ['BBOX', 'POINT'],
  SEGMENTATION: ['POLYGON', 'BBOX', 'POINT'],
};

export const SHAPE_NAME: Record<ShapeType, string> = { BBOX: 'Box', POLYGON: 'Polygon', POINT: 'Point' };

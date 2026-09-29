import type { TaskDetail } from '../../types/task';
import type { ShapeType } from '../../types/label';
import type { ProjectType } from '../../types/project';
import type { Tool } from './map/annotation-map';

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

// Drawing tools per project type. Segmentation only makes polygons: drawn, found by the magic pen or painted.
export const TOOLS_BY_TYPE: Record<ProjectType, Tool[]> = {
  DETECTION: ['BBOX', 'OBB'],
  SEGMENTATION: ['POLYGON', 'WAND', 'BRUSH'],
};

// Name, keyboard key and a one-line "how to" of each tool
export const TOOL_INFO: Record<Tool, { name: string; key: string; hint: string }> = {
  SELECT: { name: 'Select / edit', key: 'V', hint: 'Click a shape to select it. Drag a corner to reshape it, drag inside to move it.' },
  BBOX: { name: 'Box', key: 'B', hint: 'Press, drag and release.' },
  OBB: { name: 'Rotated box', key: 'O', hint: 'Click two corners along one side, then click to set the width. Turn it later with its round knob.' },
  POLYGON: { name: 'Polygon', key: 'P', hint: 'Click the corners, double-click to finish.' },
  WAND: { name: 'Magic pen', key: 'M', hint: 'Click an object: its outline is found by colour. Edit it afterwards with Select (V).' },
  BRUSH: { name: 'Brush', key: 'B', hint: 'Paint over an object. Strokes join the selected shape; hold Shift to erase. Esc starts a new shape.' },
};

export const SHAPE_NAME: Record<ShapeType, string> = { BBOX: 'Box', OBB: 'Rotated box', POLYGON: 'Polygon', POINT: 'Point' };

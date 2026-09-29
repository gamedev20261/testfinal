import { pgEnum } from 'drizzle-orm/pg-core';

// The three portals: decides what a user sees after logging in
export const roleEnum = pgEnum('role', ['ADMIN', 'ANNOTATOR', 'AUDITOR']);

export const projectTypeEnum = pgEnum('project_type', ['DETECTION', 'SEGMENTATION']);

export const projectStatusEnum = pgEnum('project_status', ['ACTIVE', 'ARCHIVED']);

// Uploaded → being turned into tiles → ready to annotate (or failed)
export const imageStatusEnum = pgEnum('image_status', ['UPLOADED', 'PROCESSING', 'READY', 'FAILED']);

// A task's life: annotator starts → submits → auditor passes or fails (→ annotator fixes)
export const taskStatusEnum = pgEnum('task_status', [
  'NOT_STARTED',
  'IN_PROGRESS',
  'SUBMITTED',
  'PASSED',
  'FAILED',
]);

// The auditor's verdict on one label, or on one image of a task
export const reviewStatusEnum = pgEnum('review_status', ['PENDING', 'APPROVED', 'REJECTED']);

// OBB = oriented (rotated) box. POINT can no longer be drawn; old points are still shown.
export const shapeTypeEnum = pgEnum('shape_type', ['BBOX', 'POLYGON', 'POINT', 'OBB']);

import { and, asc, eq, isNull, isNotNull } from 'drizzle-orm';
import { db } from '../../db/client';
import { labels, taskImages, images, projects, projectLabelClasses, labelClasses, tasks, asGeoJson, type Task } from '../../db/schema';
import { HttpError } from '../../lib/http-error';
import { findTaskForUser, assertCanEditLabels, assertCanReview } from '../../permissions/access';
import type { PublicUser } from '../auth/auth.service';
import { cleanShape, assertNotNested } from './geometry';
import type { CreateLabelInput, UpdateLabelInput, ReviewLabelInput } from './labels.schemas';

const labelColumns = {
  id: labels.id,
  imageId: labels.imageId,
  labelClassId: labels.labelClassId,
  shapeType: labels.shapeType,
  geometry: asGeoJson(labels.geom),
  reviewStatus: labels.reviewStatus,
  reviewComment: labels.reviewComment,
  createdAt: labels.createdAt,
  updatedAt: labels.updatedAt,
};

// Which shapes each project type draws
const ALLOWED_SHAPES = {
  DETECTION: ['BBOX', 'POINT'],
  SEGMENTATION: ['POLYGON', 'BBOX', 'POINT'],
} as const;

export function listLabels(taskId: string, imageId: string) {
  return db
    .select(labelColumns)
    .from(labels)
    .where(and(eq(labels.taskId, taskId), eq(labels.imageId, imageId), isNull(labels.deletedAt)))
    .orderBy(asc(labels.createdAt));
}

async function findLabelRow(labelId: string) {
  const [label] = await db.select(labelColumns).from(labels).where(eq(labels.id, labelId));
  return label;
}

// The image, if it belongs to the task and is ready to draw on
async function findTaskImage(taskId: string, imageId: string) {
  const [image] = await db
    .select({ width: images.width, height: images.height, status: images.status })
    .from(taskImages)
    .innerJoin(images, eq(taskImages.imageId, images.id))
    .where(and(eq(taskImages.taskId, taskId), eq(taskImages.imageId, imageId), isNull(images.deletedAt)));
  if (!image) throw new HttpError(404, 'This image is not part of the task');
  if (image.status !== 'READY' || !image.width || !image.height) {
    throw new HttpError(409, 'This image is still being processed');
  }
  return { width: image.width, height: image.height };
}

async function assertClassAllowed(task: Task, labelClassId: string) {
  const [allowed] = await db
    .select({ id: labelClasses.id })
    .from(projectLabelClasses)
    .innerJoin(labelClasses, eq(projectLabelClasses.labelClassId, labelClasses.id))
    .where(
      and(
        eq(projectLabelClasses.projectId, task.projectId),
        eq(projectLabelClasses.labelClassId, labelClassId),
        isNull(labelClasses.deletedAt),
      ),
    );
  if (!allowed) throw new HttpError(400, 'This label class is not used in this project');
}

async function assertShapeAllowed(task: Task, shapeType: CreateLabelInput['shapeType']) {
  const project = await db.query.projects.findFirst({ where: eq(projects.id, task.projectId), columns: { type: true } });
  const allowed: readonly string[] = ALLOWED_SHAPES[project!.type];
  if (!allowed.includes(shapeType)) {
    throw new HttpError(400, `A ${project!.type.toLowerCase()} project can't use ${shapeType.toLowerCase()} shapes`);
  }
}

// Editing a task that was not started (or failed review) puts it back in progress
async function markInProgress(task: Task) {
  if (task.status !== 'NOT_STARTED' && task.status !== 'FAILED') return;
  await db.update(tasks).set({ status: 'IN_PROGRESS' }).where(and(eq(tasks.id, task.id), eq(tasks.status, task.status)));
}

export async function createLabel(user: PublicUser, taskId: string, imageId: string, input: CreateLabelInput) {
  const { task, role } = await findTaskForUser(user, taskId);
  assertCanEditLabels(task, role);
  const { width, height } = await findTaskImage(taskId, imageId);
  await assertClassAllowed(task, input.labelClassId);
  await assertShapeAllowed(task, input.shapeType);

  const geometry = await cleanShape(input.shapeType, input.geometry, width, height);
  await assertNotNested({ taskId, imageId, shapeType: input.shapeType, geometry });

  const [created] = await db
    .insert(labels)
    .values({ taskId, imageId, labelClassId: input.labelClassId, shapeType: input.shapeType, geom: geometry, createdById: user.id })
    .returning({ id: labels.id });
  await markInProgress(task);
  return findLabelRow(created.id);
}

// The label and what this user is in its task
async function findLabelForUser(user: PublicUser, labelId: string, deleted = false) {
  const label = await db.query.labels.findFirst({
    where: and(eq(labels.id, labelId), deleted ? isNotNull(labels.deletedAt) : isNull(labels.deletedAt)),
  });
  if (!label) throw new HttpError(404, 'Shape not found');
  const { task, role } = await findTaskForUser(user, label.taskId);
  return { label, task, role };
}

// Changing a shape sends it back to the auditor ("not reviewed yet")
export async function updateLabel(user: PublicUser, labelId: string, input: UpdateLabelInput) {
  const { label, task, role } = await findLabelForUser(user, labelId);
  assertCanEditLabels(task, role);
  if (input.labelClassId) await assertClassAllowed(task, input.labelClassId);

  let geometry;
  if (input.geometry) {
    const { width, height } = await findTaskImage(task.id, label.imageId);
    geometry = await cleanShape(label.shapeType, input.geometry, width, height);
    await assertNotNested({ taskId: task.id, imageId: label.imageId, shapeType: label.shapeType, geometry, exceptLabelId: labelId });
  }

  await db
    .update(labels)
    .set({
      labelClassId: input.labelClassId,
      geom: geometry,
      reviewStatus: 'PENDING',
      reviewComment: null,
      reviewedById: null,
      reviewedAt: null,
    })
    .where(eq(labels.id, labelId));
  await markInProgress(task);
  return findLabelRow(labelId);
}

export async function deleteLabel(user: PublicUser, labelId: string) {
  const { task, role } = await findLabelForUser(user, labelId);
  assertCanEditLabels(task, role);
  await db.update(labels).set({ deletedAt: new Date() }).where(eq(labels.id, labelId));
  await markInProgress(task);
}

// Undo of a delete
export async function restoreLabel(user: PublicUser, labelId: string) {
  const { task, role } = await findLabelForUser(user, labelId, true);
  assertCanEditLabels(task, role);
  await db.update(labels).set({ deletedAt: null }).where(eq(labels.id, labelId));
  return findLabelRow(labelId);
}

export async function reviewLabel(user: PublicUser, labelId: string, input: ReviewLabelInput) {
  const { label, task, role } = await findLabelForUser(user, labelId);
  assertCanReview(task, role);
  await db
    .update(labels)
    .set({ reviewStatus: input.status, reviewComment: input.comment || null, reviewedById: user.id, reviewedAt: new Date() })
    .where(eq(labels.id, labelId));

  // A rejected shape means its image can't stay approved
  if (input.status === 'REJECTED') {
    await db
      .update(taskImages)
      .set({ reviewStatus: 'PENDING' })
      .where(and(eq(taskImages.taskId, task.id), eq(taskImages.imageId, label.imageId), eq(taskImages.reviewStatus, 'APPROVED')));
  }
  return findLabelRow(labelId);
}

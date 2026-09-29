import { and, asc, desc, eq, inArray, isNull, or, sql, type SQL } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { db } from '../../db/client';
import { tasks, taskImages, images, labels, projects, users, type Task } from '../../db/schema';
import { HttpError } from '../../lib/http-error';
import { findTaskForUser, isAdmin } from '../../permissions/access';
import type { PublicUser } from '../auth/auth.service';
import { assertUsersHaveRole } from '../users/users.service';
import { ensureMembers } from '../projects/members.service';
import { listProjectLabelClasses } from '../projects/projects.service';
import { notify } from '../notifications/notifications.service';
import type { CreateTaskInput, UpdateTaskInput } from './tasks.schemas';

const annotator = alias(users, 'annotator');
const auditor = alias(users, 'auditor');

const taskColumns = {
  id: tasks.id,
  projectId: tasks.projectId,
  name: tasks.name,
  description: tasks.description,
  status: tasks.status,
  reviewComment: tasks.reviewComment,
  submittedAt: tasks.submittedAt,
  reviewedAt: tasks.reviewedAt,
  createdAt: tasks.createdAt,
  updatedAt: tasks.updatedAt,
  annotator: { id: annotator.id, name: annotator.name },
  auditor: { id: auditor.id, name: auditor.name },
  imageIds: sql<string[]>`ARRAY(
    SELECT ti.image_id::text FROM task_images ti WHERE ti.task_id = tasks.id ORDER BY ti.position
  )`,
  labelCount: sql<number>`(SELECT count(*)::int FROM labels l WHERE l.task_id = tasks.id AND l.deleted_at IS NULL)`,
  rejectedCount: sql<number>`(
    SELECT count(*)::int FROM labels l
    WHERE l.task_id = tasks.id AND l.deleted_at IS NULL AND l.review_status = 'REJECTED'
  )`,
};

// Tasks with their annotator's and auditor's names
function selectTasks() {
  return db
    .select(taskColumns)
    .from(tasks)
    .innerJoin(annotator, eq(tasks.annotatorId, annotator.id))
    .innerJoin(auditor, eq(tasks.auditorId, auditor.id));
}

// Only tasks the user works on, unless they are an admin
const visibleTo = (user: PublicUser) =>
  isAdmin(user) ? undefined : or(eq(tasks.annotatorId, user.id), eq(tasks.auditorId, user.id));

export function listProjectTasks(user: PublicUser, projectId: string) {
  return selectTasks()
    .where(and(eq(tasks.projectId, projectId), isNull(tasks.deletedAt), visibleTo(user)))
    .orderBy(asc(tasks.createdAt));
}

// "Labeling tasks" page: everything assigned to me, newest activity first
export async function listMyTasks(user: PublicUser) {
  const rows = await db
    .select({ ...taskColumns, project: { id: projects.id, name: projects.name, type: projects.type } })
    .from(tasks)
    .innerJoin(annotator, eq(tasks.annotatorId, annotator.id))
    .innerJoin(auditor, eq(tasks.auditorId, auditor.id))
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(isNull(tasks.deletedAt), isNull(projects.deletedAt), visibleTo(user)))
    .orderBy(desc(tasks.updatedAt));
  return rows.map((row) => ({ ...row, myRole: roleIn(row, user) }));
}

const roleIn = (task: { annotator: { id: string }; auditor: { id: string } }, user: PublicUser) =>
  task.annotator.id === user.id ? 'ANNOTATOR' : task.auditor.id === user.id ? 'AUDITOR' : 'ADMIN';

async function findTaskRow(taskId: string) {
  const [row] = await selectTasks().where(eq(tasks.id, taskId));
  return row;
}

// Counts of this task's shapes on one image of the task
const labelsOnImage = (extra?: SQL) => sql<number>`(
  SELECT count(*)::int FROM labels l
  WHERE l.task_id = task_images.task_id AND l.image_id = task_images.image_id AND l.deleted_at IS NULL ${extra ?? sql``}
)`;

export function listTaskImages(taskId: string) {
  return db
    .select({
      id: images.id,
      originalName: images.originalName,
      width: images.width,
      height: images.height,
      status: images.status,
      reviewStatus: taskImages.reviewStatus,
      reviewComment: taskImages.reviewComment,
      labelCount: labelsOnImage(),
      pendingCount: labelsOnImage(sql`AND l.review_status = 'PENDING'`),
      rejectedCount: labelsOnImage(sql`AND l.review_status = 'REJECTED'`),
    })
    .from(taskImages)
    .innerJoin(images, eq(taskImages.imageId, images.id))
    .where(and(eq(taskImages.taskId, taskId), isNull(images.deletedAt)))
    .orderBy(asc(taskImages.position));
}

// Everything the editor needs to open a task
export async function getTaskDetail(user: PublicUser, taskId: string) {
  const { task, role } = await findTaskForUser(user, taskId);
  const [row, project, taskImageList, labelClasses] = await Promise.all([
    findTaskRow(taskId),
    db.query.projects.findFirst({ where: eq(projects.id, task.projectId), columns: { id: true, name: true, type: true } }),
    listTaskImages(taskId),
    listProjectLabelClasses(task.projectId),
  ]);
  return { task: row, project, myRole: role, images: taskImageList, labelClasses };
}

async function assertImagesInProject(projectId: string, imageIds: string[]) {
  const found = await db
    .select({ id: images.id })
    .from(images)
    .where(and(inArray(images.id, imageIds), eq(images.projectId, projectId), isNull(images.deletedAt)));
  if (found.length !== imageIds.length) throw new HttpError(400, 'Choose images of this project');
}

async function checkPeople(input: { annotatorId?: string; auditorId?: string }) {
  if (input.annotatorId) await assertUsersHaveRole([input.annotatorId], 'ANNOTATOR');
  if (input.auditorId) await assertUsersHaveRole([input.auditorId], 'AUDITOR');
}

function notifyAssigned(task: Pick<Task, 'id' | 'name'>, userIds: string[]) {
  return notify(
    userIds.map((userId) => ({
      userId,
      type: 'TASK_ASSIGNED' as const,
      title: 'New task',
      message: `You were assigned to the task "${task.name}".`,
      link: `/tasks/${task.id}`,
    })),
  );
}

export async function createTask(projectId: string, input: CreateTaskInput) {
  const imageIds = [...new Set(input.imageIds)];
  await checkPeople(input);
  await assertImagesInProject(projectId, imageIds);

  const task = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(tasks)
      .values({
        projectId,
        name: input.name,
        description: input.description,
        annotatorId: input.annotatorId,
        auditorId: input.auditorId,
      })
      .returning();
    await tx.insert(taskImages).values(imageIds.map((imageId, position) => ({ taskId: created.id, imageId, position })));
    return created;
  });
  await ensureMembers(projectId, [input.annotatorId, input.auditorId]);
  await notifyAssigned(task, [input.annotatorId, input.auditorId]);
  return findTaskRow(task.id);
}

async function findLiveTask(taskId: string) {
  const task = await db.query.tasks.findFirst({ where: and(eq(tasks.id, taskId), isNull(tasks.deletedAt)) });
  if (!task) throw new HttpError(404, 'Task not found');
  return task;
}

export async function updateTask(taskId: string, input: UpdateTaskInput) {
  const task = await findLiveTask(taskId);
  await checkPeople(input);
  if (input.imageIds) await replaceImages(task, [...new Set(input.imageIds)]);

  await db
    .update(tasks)
    .set({ name: input.name, description: input.description, annotatorId: input.annotatorId, auditorId: input.auditorId })
    .where(eq(tasks.id, taskId));

  const newPeople = [input.annotatorId, input.auditorId].filter(
    (id): id is string => !!id && id !== task.annotatorId && id !== task.auditorId,
  );
  if (newPeople.length > 0) {
    await ensureMembers(task.projectId, newPeople);
    await notifyAssigned(task, newPeople);
  }
  return findTaskRow(taskId);
}

// An image that already has shapes in this task can't be taken out of it
async function replaceImages(task: Task, imageIds: string[]) {
  await assertImagesInProject(task.projectId, imageIds);
  const current = await db.select({ imageId: taskImages.imageId }).from(taskImages).where(eq(taskImages.taskId, task.id));
  const removed = current.map((row) => row.imageId).filter((id) => !imageIds.includes(id));

  if (removed.length > 0) {
    const [used] = await db
      .select({ name: images.originalName })
      .from(labels)
      .innerJoin(images, eq(labels.imageId, images.id))
      .where(and(eq(labels.taskId, task.id), inArray(labels.imageId, removed), isNull(labels.deletedAt)))
      .limit(1);
    if (used) throw new HttpError(409, `${used.name} has shapes in this task, so it can't be removed`);
  }

  await db.transaction(async (tx) => {
    if (removed.length > 0) {
      await tx.delete(taskImages).where(and(eq(taskImages.taskId, task.id), inArray(taskImages.imageId, removed)));
    }
    // Add the new images and store the chosen order
    await tx
      .insert(taskImages)
      .values(imageIds.map((imageId, position) => ({ taskId: task.id, imageId, position })))
      .onConflictDoUpdate({ target: [taskImages.taskId, taskImages.imageId], set: { position: sql`excluded.position` } });
  });
}

// The task and its shapes disappear together
export async function deleteTask(taskId: string) {
  await findLiveTask(taskId);
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx.update(tasks).set({ deletedAt: now }).where(eq(tasks.id, taskId));
    await tx.update(labels).set({ deletedAt: now }).where(and(eq(labels.taskId, taskId), isNull(labels.deletedAt)));
  });
}

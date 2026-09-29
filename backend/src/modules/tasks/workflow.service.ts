import { and, eq, inArray, isNull, count } from 'drizzle-orm';
import { db } from '../../db/client';
import { tasks, taskImages, labels, images, type Task } from '../../db/schema';
import { HttpError } from '../../lib/http-error';
import { assertCanReview, type TaskRole } from '../../permissions/access';
import { notify } from '../notifications/notifications.service';
import type { ReviewTaskInput, ReviewImageInput } from './tasks.schemas';

// The life of a task:
//   NOT_STARTED → IN_PROGRESS → SUBMITTED → PASSED
//                      ↑             ↓
//                      └──────── FAILED (the annotator fixes it and submits again)

type TaskStatus = Task['status'];

// Changes the status only if it is still one of `from`, so two clicks at once can't both win
export async function moveTask(taskId: string, from: TaskStatus[], changes: Partial<Task> & { status: TaskStatus }) {
  const [moved] = await db
    .update(tasks)
    .set(changes)
    .where(and(eq(tasks.id, taskId), inArray(tasks.status, from), isNull(tasks.deletedAt)))
    .returning();
  if (!moved) throw new HttpError(409, 'The task changed in the meantime. Reload the page and try again.');
  return moved;
}

function assertIsAnnotator(role: TaskRole) {
  if (role === 'AUDITOR') throw new HttpError(403, 'Only the annotator of this task can do this');
}

// The annotator opens the task and begins work
export async function startTask(task: Task, role: TaskRole) {
  assertIsAnnotator(role);
  if (task.status === 'IN_PROGRESS') return task;
  if (task.status !== 'NOT_STARTED' && task.status !== 'FAILED') {
    throw new HttpError(409, 'This task is already submitted');
  }
  return moveTask(task.id, ['NOT_STARTED', 'FAILED'], { status: 'IN_PROGRESS' });
}

// The annotator hands the task to the auditor
export async function submitTask(task: Task, role: TaskRole) {
  assertIsAnnotator(role);
  const [{ rejected }] = await db
    .select({ rejected: count() })
    .from(labels)
    .where(and(eq(labels.taskId, task.id), eq(labels.reviewStatus, 'REJECTED'), isNull(labels.deletedAt)));
  if (rejected > 0) {
    throw new HttpError(409, `${rejected} shape(s) were rejected by the auditor. Fix or delete them before submitting.`);
  }

  const submitted = await moveTask(task.id, ['NOT_STARTED', 'IN_PROGRESS', 'FAILED'], {
    status: 'SUBMITTED',
    submittedAt: new Date(),
    reviewComment: null,
  });
  // Images rejected last round are reviewed again
  await db
    .update(taskImages)
    .set({ reviewStatus: 'PENDING', reviewComment: null })
    .where(and(eq(taskImages.taskId, task.id), eq(taskImages.reviewStatus, 'REJECTED')));

  await notify([
    {
      userId: task.auditorId,
      type: 'TASK_SUBMITTED',
      title: 'Ready for review',
      message: `The task "${task.name}" was submitted for review.`,
      link: `/tasks/${task.id}`,
    },
  ]);
  return submitted;
}

// The auditor's verdict on the whole task
export async function reviewTask(task: Task, role: TaskRole, reviewerId: string, input: ReviewTaskInput) {
  assertCanReview(task, role);
  if (input.result === 'PASSED') {
    await assertNoRejectedLabels(task.id);
    await approvePendingLabels(task.id, reviewerId);
    await db.update(taskImages).set({ reviewStatus: 'APPROVED' }).where(eq(taskImages.taskId, task.id));
  }
  return finishReview(task, input.result, input.comment);
}

// The auditor's verdict on one image. When every image has one, the task is decided.
export async function reviewImage(task: Task, role: TaskRole, reviewerId: string, imageId: string, input: ReviewImageInput) {
  assertCanReview(task, role);
  if (input.result === 'APPROVED') {
    await assertNoRejectedLabels(task.id, imageId);
    await approvePendingLabels(task.id, reviewerId, imageId);
  }
  const [updated] = await db
    .update(taskImages)
    .set({ reviewStatus: input.result, reviewComment: input.comment || null })
    .where(and(eq(taskImages.taskId, task.id), eq(taskImages.imageId, imageId)))
    .returning();
  if (!updated) throw new HttpError(404, 'This image is not part of the task');

  const verdicts = await db
    .select({ name: images.originalName, status: taskImages.reviewStatus, comment: taskImages.reviewComment })
    .from(taskImages)
    .innerJoin(images, eq(taskImages.imageId, images.id))
    .where(and(eq(taskImages.taskId, task.id), isNull(images.deletedAt)));
  if (verdicts.some((image) => image.status === 'PENDING')) return null;

  const rejected = verdicts.filter((image) => image.status === 'REJECTED');
  if (rejected.length === 0) return finishReview(task, 'PASSED', '');
  return finishReview(task, 'FAILED', rejected.map((image) => `${image.name}: ${image.comment}`).join('\n'));
}

async function finishReview(task: Task, result: 'PASSED' | 'FAILED', comment: string) {
  const reviewed = await moveTask(task.id, ['SUBMITTED'], {
    status: result,
    reviewComment: comment || null,
    reviewedAt: new Date(),
  });
  const passed = result === 'PASSED';
  await notify([
    {
      userId: task.annotatorId,
      type: passed ? 'TASK_PASSED' : 'TASK_FAILED',
      title: passed ? 'Task passed' : 'Task needs changes',
      message: passed ? `"${task.name}" passed review.` : `"${task.name}" failed review: ${comment}`,
      link: `/tasks/${task.id}`,
    },
  ]);
  return reviewed;
}

async function assertNoRejectedLabels(taskId: string, imageId?: string) {
  const [{ rejected }] = await db
    .select({ rejected: count() })
    .from(labels)
    .where(
      and(
        eq(labels.taskId, taskId),
        imageId ? eq(labels.imageId, imageId) : undefined,
        eq(labels.reviewStatus, 'REJECTED'),
        isNull(labels.deletedAt),
      ),
    );
  if (rejected > 0) {
    throw new HttpError(409, `${rejected} shape(s) are rejected. Fail it so the annotator can fix them, or approve them first.`);
  }
}

// "Approve all": every shape not reviewed yet becomes approved
export async function approvePendingLabels(taskId: string, reviewerId: string, imageId?: string) {
  const approved = await db
    .update(labels)
    .set({ reviewStatus: 'APPROVED', reviewedById: reviewerId, reviewedAt: new Date() })
    .where(
      and(
        eq(labels.taskId, taskId),
        imageId ? eq(labels.imageId, imageId) : undefined,
        eq(labels.reviewStatus, 'PENDING'),
        isNull(labels.deletedAt),
      ),
    )
    .returning({ id: labels.id });
  return approved.length;
}

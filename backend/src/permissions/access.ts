import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../db/client';
import { projects, projectMembers, tasks, type Project, type Task } from '../db/schema';
import { HttpError } from '../lib/http-error';
import type { PublicUser } from '../modules/auth/auth.service';

// Who may do what — all rules in one place.
//   Admins:     everything.
//   Annotators: see their projects; edit labels of tasks assigned to them.
//   Auditors:   see their projects; review tasks assigned to them.

export const isAdmin = (user: PublicUser) => user.role === 'ADMIN';

// The project, if this user may see it. Otherwise 404 (we don't reveal that it exists).
export async function findProjectForUser(user: PublicUser, projectId: string): Promise<Project> {
  const project = await db.query.projects.findFirst({
    where: and(eq(projects.id, projectId), isNull(projects.deletedAt)),
  });
  if (!project) throw new HttpError(404, 'Project not found');
  if (isAdmin(user)) return project;

  const member = await db.query.projectMembers.findFirst({
    where: and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)),
  });
  if (!member) throw new HttpError(404, 'Project not found');
  return project;
}

// What this user is in a task: its annotator, its auditor, or an admin
export type TaskRole = 'ANNOTATOR' | 'AUDITOR' | 'ADMIN';

export async function findTaskForUser(user: PublicUser, taskId: string): Promise<{ task: Task; role: TaskRole }> {
  const [row] = await db
    .select({ task: tasks })
    .from(tasks)
    .innerJoin(projects, eq(tasks.projectId, projects.id))
    .where(and(eq(tasks.id, taskId), isNull(tasks.deletedAt), isNull(projects.deletedAt)));
  if (!row) throw new HttpError(404, 'Task not found');

  const { task } = row;
  if (task.annotatorId === user.id) return { task, role: 'ANNOTATOR' };
  if (task.auditorId === user.id) return { task, role: 'AUDITOR' };
  if (isAdmin(user)) return { task, role: 'ADMIN' };
  throw new HttpError(404, 'Task not found');
}

// Labels can be changed by the task's annotator (or an admin) while the task is being worked on
export function assertCanEditLabels(task: Task, role: TaskRole) {
  if (role === 'AUDITOR') throw new HttpError(403, 'Auditors review labels but do not change them');
  if (task.status === 'SUBMITTED') throw new HttpError(409, 'This task was submitted for review. Wait for the auditor.');
  if (task.status === 'PASSED') throw new HttpError(409, 'This task has passed review and is locked');
}

// The task's auditor (or an admin) reviews, only while the task is submitted
export function assertCanReview(task: Task, role: TaskRole) {
  if (role === 'ANNOTATOR') throw new HttpError(403, "You can't review your own work");
  if (task.status !== 'SUBMITTED') throw new HttpError(409, 'Only a submitted task can be reviewed');
}

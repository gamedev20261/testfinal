import { and, asc, eq, inArray, isNull, ne, or } from 'drizzle-orm';
import { db } from '../../db/client';
import { projectMembers, users, tasks } from '../../db/schema';
import { HttpError } from '../../lib/http-error';

// Team tab: the annotators and auditors of a project
export function listMembers(projectId: string) {
  return db
    .select({ id: users.id, name: users.name, email: users.email, role: users.role, addedAt: projectMembers.createdAt })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(and(eq(projectMembers.projectId, projectId), isNull(users.deletedAt)))
    .orderBy(asc(users.name));
}

// Adds users to the team (admins don't need it: they see every project). Already added = ignored.
export async function addMembers(projectId: string, userIds: string[]) {
  const unique = [...new Set(userIds)];
  const found = await db
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.id, unique), isNull(users.deletedAt), ne(users.role, 'ADMIN')));
  if (found.length !== unique.length) throw new HttpError(400, 'Choose annotators or auditors');

  await db
    .insert(projectMembers)
    .values(unique.map((userId) => ({ projectId, userId })))
    .onConflictDoNothing();
  return listMembers(projectId);
}

// A member who still has open work in this project can't be removed
export async function removeMember(projectId: string, userId: string) {
  const openTasks = await db
    .select({ name: tasks.name })
    .from(tasks)
    .where(
      and(
        eq(tasks.projectId, projectId),
        isNull(tasks.deletedAt),
        ne(tasks.status, 'PASSED'),
        or(eq(tasks.annotatorId, userId), eq(tasks.auditorId, userId)),
      ),
    );
  if (openTasks.length > 0) {
    throw new HttpError(409, `This user still has open tasks here: ${openTasks.map((task) => task.name).join(', ')}`);
  }
  await db.delete(projectMembers).where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, userId)));
}

// Used when a task is assigned: its annotator and auditor join the project automatically
export async function ensureMembers(projectId: string, userIds: string[]) {
  await db
    .insert(projectMembers)
    .values(userIds.map((userId) => ({ projectId, userId })))
    .onConflictDoNothing();
}

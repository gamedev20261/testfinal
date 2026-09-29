import { and, asc, eq, isNull, ne, or, inArray } from 'drizzle-orm';
import { db } from '../../db/client';
import { users, userGroups, tasks, projectMembers } from '../../db/schema';
import { hashPassword } from '../../lib/password';
import { HttpError } from '../../lib/http-error';
import { sessionsValidFromNow } from '../../lib/session';
import type { CreateUserInput, UpdateUserInput } from './users.schemas';

const userColumns = {
  id: users.id,
  name: users.name,
  email: users.email,
  role: users.role,
  groupId: users.groupId,
  groupName: userGroups.name,
  createdAt: users.createdAt,
};

export function listUsers() {
  return db
    .select(userColumns)
    .from(users)
    .leftJoin(userGroups, eq(users.groupId, userGroups.id))
    .where(isNull(users.deletedAt))
    .orderBy(asc(users.name));
}

async function findUser(id: string) {
  const [user] = await db
    .select(userColumns)
    .from(users)
    .leftJoin(userGroups, eq(users.groupId, userGroups.id))
    .where(and(eq(users.id, id), isNull(users.deletedAt)));
  if (!user) throw new HttpError(404, 'User not found');
  return user;
}

async function assertEmailFree(email: string, exceptUserId?: string) {
  const taken = await db.query.users.findFirst({
    where: and(eq(users.email, email), isNull(users.deletedAt), exceptUserId ? ne(users.id, exceptUserId) : undefined),
  });
  if (taken) throw new HttpError(409, 'A user with this email already exists');
}

export async function createUser(input: CreateUserInput) {
  await assertEmailFree(input.email);
  const [created] = await db
    .insert(users)
    .values({
      name: input.name,
      email: input.email,
      role: input.role,
      groupId: input.groupId ?? null,
      passwordHash: await hashPassword(input.password),
    })
    .returning({ id: users.id });
  return findUser(created.id);
}

export async function updateUser(id: string, input: UpdateUserInput, actingUserId: string) {
  const user = await findUser(id);
  if (id === actingUserId && input.role && input.role !== 'ADMIN') {
    throw new HttpError(400, "You can't remove your own admin role");
  }
  if (input.email) await assertEmailFree(input.email, id);

  const roleChanged = input.role !== undefined && input.role !== user.role;
  await db
    .update(users)
    .set({
      name: input.name,
      email: input.email,
      role: input.role,
      groupId: input.groupId,
      passwordHash: input.password ? await hashPassword(input.password) : undefined,
      // A new password or role logs the user out everywhere
      sessionsValidAfter: input.password || roleChanged ? sessionsValidFromNow() : undefined,
    })
    .where(eq(users.id, id));
  return findUser(id);
}

// Soft delete: the user disappears but their past labels keep their author
export async function deleteUser(id: string, actingUserId: string) {
  if (id === actingUserId) throw new HttpError(400, "You can't delete your own account");
  await findUser(id);

  const openTasks = await db
    .select({ name: tasks.name })
    .from(tasks)
    .where(
      and(
        or(eq(tasks.annotatorId, id), eq(tasks.auditorId, id)),
        isNull(tasks.deletedAt),
        ne(tasks.status, 'PASSED'),
      ),
    );
  if (openTasks.length > 0) {
    const names = openTasks.map((task) => task.name).join(', ');
    throw new HttpError(409, `This user still has open tasks: ${names}. Reassign them first.`);
  }

  await db.transaction(async (tx) => {
    await tx.update(users).set({ deletedAt: new Date(), sessionsValidAfter: sessionsValidFromNow() }).where(eq(users.id, id));
    await tx.delete(projectMembers).where(eq(projectMembers.userId, id));
  });
}

// Checks that every id is a live user with the given role (used when assigning work)
export async function assertUsersHaveRole(ids: string[], role: 'ANNOTATOR' | 'AUDITOR') {
  if (ids.length === 0) return;
  const found = await db
    .select({ id: users.id })
    .from(users)
    .where(and(inArray(users.id, ids), eq(users.role, role), isNull(users.deletedAt)));
  if (found.length !== new Set(ids).size) {
    throw new HttpError(400, `Choose a valid ${role.toLowerCase()}`);
  }
}

import { asc, eq, and, ne, sql, isNull } from 'drizzle-orm';
import { db } from '../../db/client';
import { userGroups, users } from '../../db/schema';
import { HttpError } from '../../lib/http-error';

export function listUserGroups() {
  return db
    .select({
      id: userGroups.id,
      name: userGroups.name,
      userCount: sql<number>`(
        SELECT count(*)::int FROM users u
        WHERE u.group_id = user_groups.id AND u.deleted_at IS NULL
      )`,
    })
    .from(userGroups)
    .orderBy(asc(userGroups.name));
}

async function assertNameFree(name: string, exceptId?: string) {
  const taken = await db.query.userGroups.findFirst({
    where: and(sql`lower(${userGroups.name}) = lower(${name})`, exceptId ? ne(userGroups.id, exceptId) : undefined),
  });
  if (taken) throw new HttpError(409, 'A group with this name already exists');
}

export async function createUserGroup(name: string) {
  await assertNameFree(name);
  const [group] = await db.insert(userGroups).values({ name }).returning();
  return group;
}

export async function renameUserGroup(id: string, name: string) {
  await assertNameFree(name, id);
  const [group] = await db.update(userGroups).set({ name }).where(eq(userGroups.id, id)).returning();
  if (!group) throw new HttpError(404, 'Group not found');
  return group;
}

// Its users stay, without a group
export async function deleteUserGroup(id: string) {
  await db.update(users).set({ groupId: null }).where(and(eq(users.groupId, id), isNull(users.deletedAt)));
  const deleted = await db.delete(userGroups).where(eq(userGroups.id, id)).returning();
  if (deleted.length === 0) throw new HttpError(404, 'Group not found');
}

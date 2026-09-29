import { and, asc, eq, isNull, ne, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { labelClasses, labelGroups } from '../../db/schema';
import { HttpError } from '../../lib/http-error';
import type { CreateLabelClassInput, UpdateLabelClassInput } from './label-classes.schemas';

const classColumns = {
  id: labelClasses.id,
  name: labelClasses.name,
  color: labelClasses.color,
  groupId: labelClasses.groupId,
  groupName: labelGroups.name,
  // How many shapes use it, so the admin knows before deleting
  labelCount: sql<number>`(
    SELECT count(*)::int FROM labels l
    WHERE l.label_class_id = label_classes.id AND l.deleted_at IS NULL
  )`,
};

export function listLabelClasses() {
  return db
    .select(classColumns)
    .from(labelClasses)
    .leftJoin(labelGroups, eq(labelClasses.groupId, labelGroups.id))
    .where(isNull(labelClasses.deletedAt))
    .orderBy(asc(labelClasses.name));
}

async function findLabelClass(id: string) {
  const [found] = await db
    .select(classColumns)
    .from(labelClasses)
    .leftJoin(labelGroups, eq(labelClasses.groupId, labelGroups.id))
    .where(and(eq(labelClasses.id, id), isNull(labelClasses.deletedAt)));
  if (!found) throw new HttpError(404, 'Label class not found');
  return found;
}

async function assertNameFree(name: string, exceptId?: string) {
  const taken = await db.query.labelClasses.findFirst({
    where: and(
      sql`lower(${labelClasses.name}) = lower(${name})`,
      isNull(labelClasses.deletedAt),
      exceptId ? ne(labelClasses.id, exceptId) : undefined,
    ),
  });
  if (taken) throw new HttpError(409, 'A label class with this name already exists');
}

export async function createLabelClass(input: CreateLabelClassInput) {
  await assertNameFree(input.name);
  const [created] = await db
    .insert(labelClasses)
    .values({ name: input.name, color: input.color.toLowerCase(), groupId: input.groupId ?? null })
    .returning({ id: labelClasses.id });
  return findLabelClass(created.id);
}

export async function updateLabelClass(id: string, input: UpdateLabelClassInput) {
  await findLabelClass(id);
  if (input.name) await assertNameFree(input.name, id);
  await db
    .update(labelClasses)
    .set({ name: input.name, color: input.color?.toLowerCase(), groupId: input.groupId })
    .where(eq(labelClasses.id, id));
  return findLabelClass(id);
}

// Soft delete: existing shapes keep their class, but it can't be chosen anymore
export async function deleteLabelClass(id: string) {
  await findLabelClass(id);
  await db.update(labelClasses).set({ deletedAt: new Date() }).where(eq(labelClasses.id, id));
}

// ── Label groups ──

export function listLabelGroups() {
  return db.select({ id: labelGroups.id, name: labelGroups.name }).from(labelGroups).orderBy(asc(labelGroups.name));
}

export async function createLabelGroup(name: string) {
  const [group] = await db.insert(labelGroups).values({ name }).returning({ id: labelGroups.id, name: labelGroups.name });
  return group;
}

export async function renameLabelGroup(id: string, name: string) {
  const [group] = await db
    .update(labelGroups)
    .set({ name })
    .where(eq(labelGroups.id, id))
    .returning({ id: labelGroups.id, name: labelGroups.name });
  if (!group) throw new HttpError(404, 'Group not found');
  return group;
}

// Its classes stay, without a group
export async function deleteLabelGroup(id: string) {
  await db.update(labelClasses).set({ groupId: null }).where(eq(labelClasses.groupId, id));
  const deleted = await db.delete(labelGroups).where(eq(labelGroups.id, id)).returning();
  if (deleted.length === 0) throw new HttpError(404, 'Group not found');
}

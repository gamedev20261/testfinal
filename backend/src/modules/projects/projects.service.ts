import { and, asc, desc, eq, exists, inArray, isNull, or, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import {
  projects,
  projectMembers,
  projectLabelClasses,
  labelClasses,
  labelGroups,
  images,
  tasks,
  users,
} from '../../db/schema';
import { HttpError } from '../../lib/http-error';
import { findProjectForUser, isAdmin } from '../../permissions/access';
import type { PublicUser } from '../auth/auth.service';
import type { CreateProjectInput, UpdateProjectInput } from './projects.schemas';

// Numbers shown on each project card (plain SQL subqueries; "projects.id" is the outer row)
const projectColumns = {
  id: projects.id,
  name: projects.name,
  description: projects.description,
  type: projects.type,
  status: projects.status,
  createdAt: projects.createdAt,
  imageCount: sql<number>`(
    SELECT count(*)::int FROM images i
    WHERE i.project_id = projects.id AND i.deleted_at IS NULL
  )`,
  taskCount: sql<number>`(
    SELECT count(*)::int FROM tasks t
    WHERE t.project_id = projects.id AND t.deleted_at IS NULL
  )`,
  labelCount: sql<number>`(
    SELECT count(*)::int FROM labels l JOIN tasks t ON t.id = l.task_id
    WHERE t.project_id = projects.id AND t.deleted_at IS NULL AND l.deleted_at IS NULL
  )`,
  // The latest change anywhere in the project: its own edit, a task, or a label
  lastActivityAt: sql<Date>`GREATEST(
    projects.updated_at,
    (SELECT max(t.updated_at) FROM tasks t WHERE t.project_id = projects.id),
    (SELECT max(l.updated_at) FROM labels l JOIN tasks t ON t.id = l.task_id WHERE t.project_id = projects.id)
  )`,
};

export async function listProjects(user: PublicUser) {
  const isMember = exists(
    db
      .select()
      .from(projectMembers)
      .where(and(eq(projectMembers.projectId, projects.id), eq(projectMembers.userId, user.id))),
  );
  const rows = await db
    .select(projectColumns)
    .from(projects)
    .where(and(isNull(projects.deletedAt), isAdmin(user) ? undefined : isMember))
    .orderBy(desc(projects.createdAt));

  const ids = rows.map((row) => row.id);
  const [thumbnails, team, myTasks] = await Promise.all([
    thumbnailsByProject(ids),
    annotatorsByProject(ids),
    tasksOfUserByProject(user, ids),
  ]);

  return rows.map((row) => ({
    ...row,
    thumbnailImageIds: thumbnails.get(row.id) ?? [],
    annotators: team.get(row.id) ?? [],
    myTaskId: myTasks.get(row.id) ?? null,
  }));
}

// Up to 4 ready images per project, for the card preview
async function thumbnailsByProject(projectIds: string[]) {
  const result = new Map<string, string[]>();
  if (projectIds.length === 0) return result;
  const rows = await db
    .select({ id: images.id, projectId: images.projectId })
    .from(images)
    .where(and(inArray(images.projectId, projectIds), eq(images.status, 'READY'), isNull(images.deletedAt)))
    .orderBy(asc(images.createdAt));
  for (const row of rows) {
    const list = result.get(row.projectId) ?? [];
    if (list.length < 4) list.push(row.id);
    result.set(row.projectId, list);
  }
  return result;
}

async function annotatorsByProject(projectIds: string[]) {
  const result = new Map<string, { id: string; name: string }[]>();
  if (projectIds.length === 0) return result;
  const rows = await db
    .select({ projectId: projectMembers.projectId, id: users.id, name: users.name })
    .from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(and(inArray(projectMembers.projectId, projectIds), eq(users.role, 'ANNOTATOR'), isNull(users.deletedAt)))
    .orderBy(asc(users.name));
  for (const { projectId, ...person } of rows) {
    result.set(projectId, [...(result.get(projectId) ?? []), person]);
  }
  return result;
}

// For annotators and auditors: their first task in each project (the card opens it)
async function tasksOfUserByProject(user: PublicUser, projectIds: string[]) {
  const result = new Map<string, string>();
  if (isAdmin(user) || projectIds.length === 0) return result;
  const rows = await db
    .select({ id: tasks.id, projectId: tasks.projectId })
    .from(tasks)
    .where(
      and(
        inArray(tasks.projectId, projectIds),
        isNull(tasks.deletedAt),
        or(eq(tasks.annotatorId, user.id), eq(tasks.auditorId, user.id)),
      ),
    )
    .orderBy(asc(tasks.createdAt));
  for (const row of rows) {
    if (!result.has(row.projectId)) result.set(row.projectId, row.id);
  }
  return result;
}

export async function createProject(input: CreateProjectInput, adminId: string) {
  const project = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(projects)
      .values({ name: input.name, description: input.description, type: input.type, createdById: adminId })
      .returning();
    if (input.labelClassIds.length > 0) {
      await tx.insert(projectLabelClasses).values(input.labelClassIds.map((labelClassId) => ({ projectId: created.id, labelClassId })));
    }
    return created;
  });
  return project;
}

export async function getProject(user: PublicUser, projectId: string) {
  await findProjectForUser(user, projectId);
  const [project] = await db.select(projectColumns).from(projects).where(eq(projects.id, projectId));
  return { ...project, labelClasses: await listProjectLabelClasses(projectId) };
}

export async function updateProject(projectId: string, input: UpdateProjectInput) {
  const [updated] = await db
    .update(projects)
    .set(input)
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .returning({ id: projects.id });
  if (!updated) throw new HttpError(404, 'Project not found');
}

export async function deleteProject(projectId: string) {
  const [deleted] = await db
    .update(projects)
    .set({ deletedAt: new Date() })
    .where(and(eq(projects.id, projectId), isNull(projects.deletedAt)))
    .returning({ id: projects.id });
  if (!deleted) throw new HttpError(404, 'Project not found');
}

// The label classes this project uses (deleted classes are left out)
export function listProjectLabelClasses(projectId: string) {
  return db
    .select({
      id: labelClasses.id,
      name: labelClasses.name,
      color: labelClasses.color,
      groupName: labelGroups.name,
    })
    .from(projectLabelClasses)
    .innerJoin(labelClasses, eq(projectLabelClasses.labelClassId, labelClasses.id))
    .leftJoin(labelGroups, eq(labelClasses.groupId, labelGroups.id))
    .where(and(eq(projectLabelClasses.projectId, projectId), isNull(labelClasses.deletedAt)))
    .orderBy(asc(labelClasses.name));
}

// Replaces the project's classes with this list. Existing shapes keep their class.
export async function setProjectLabelClasses(projectId: string, labelClassIds: string[]) {
  const unique = [...new Set(labelClassIds)];
  if (unique.length > 0) {
    const found = await db
      .select({ id: labelClasses.id })
      .from(labelClasses)
      .where(and(inArray(labelClasses.id, unique), isNull(labelClasses.deletedAt)));
    if (found.length !== unique.length) throw new HttpError(400, 'Choose valid label classes');
  }
  await db.transaction(async (tx) => {
    await tx.delete(projectLabelClasses).where(eq(projectLabelClasses.projectId, projectId));
    if (unique.length > 0) {
      await tx.insert(projectLabelClasses).values(unique.map((labelClassId) => ({ projectId, labelClassId })));
    }
  });
  return listProjectLabelClasses(projectId);
}

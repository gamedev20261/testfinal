import { mkdir, rename } from 'node:fs/promises';
import { and, asc, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../../db/client';
import { images, projects, projectMembers, taskImages, tasks, asGeoJson } from '../../db/schema';
import { HttpError } from '../../lib/http-error';
import { imageDir, removeImageFiles } from '../../lib/storage';
import { isAdmin } from '../../permissions/access';
import type { PublicUser } from '../auth/auth.service';
import { originalPath } from './processing/process-image';
import { queueImageProcessing } from './processing/image-jobs';

const imageColumns = {
  id: images.id,
  projectId: images.projectId,
  originalName: images.originalName,
  sizeBytes: images.sizeBytes,
  status: images.status,
  errorMessage: images.errorMessage,
  width: images.width,
  height: images.height,
  srid: images.srid,
  isGeoreferenced: sql<boolean>`(images.geo_transform IS NOT NULL)`,
  createdAt: images.createdAt,
  // Names of the tasks that use it
  taskNames: sql<string[]>`ARRAY(
    SELECT t.name FROM task_images ti JOIN tasks t ON t.id = ti.task_id
    WHERE ti.image_id = images.id AND t.deleted_at IS NULL ORDER BY t.name
  )`,
};

export function listProjectImages(projectId: string) {
  return db
    .select(imageColumns)
    .from(images)
    .where(and(eq(images.projectId, projectId), isNull(images.deletedAt)))
    .orderBy(asc(images.originalName));
}

export async function getImage(imageId: string) {
  const [image] = await db
    .select({ ...imageColumns, geoTransform: images.geoTransform, footprint: asGeoJson(images.footprint) })
    .from(images)
    .where(eq(images.id, imageId));
  return image;
}

// Saves uploaded files as new images and queues them for processing
export async function addUploadedImages(projectId: string, files: Express.Multer.File[], userId: string) {
  const ids: string[] = [];
  for (const file of files) {
    const [image] = await db
      .insert(images)
      .values({ projectId, originalName: file.originalname, sizeBytes: file.size, uploadedById: userId })
      .returning();
    await mkdir(imageDir(image.id), { recursive: true });
    await rename(file.path, originalPath(image));
    queueImageProcessing(image.id);
    ids.push(image.id);
  }
  return Promise.all(ids.map(getImage));
}

// Remembers recent "yes, this user may see this image" answers,
// because the editor asks for hundreds of tiles per screen.
const allowed = new Map<string, number>();
const ALLOWED_FOR_MS = 60_000;

// 404 unless the image exists and the user is an admin or a member of its project
export async function assertCanViewImage(user: PublicUser, imageId: string) {
  const key = `${user.id}:${imageId}`;
  if ((allowed.get(key) ?? 0) > Date.now()) return;

  const [row] = await db
    .select({ projectId: images.projectId })
    .from(images)
    .innerJoin(projects, eq(images.projectId, projects.id))
    .where(and(eq(images.id, imageId), isNull(images.deletedAt), isNull(projects.deletedAt)));
  if (!row) throw new HttpError(404, 'Image not found');

  if (!isAdmin(user)) {
    const member = await db.query.projectMembers.findFirst({
      where: and(eq(projectMembers.projectId, row.projectId), eq(projectMembers.userId, user.id)),
    });
    if (!member) throw new HttpError(404, 'Image not found');
  }
  if (allowed.size > 10_000) allowed.clear();
  allowed.set(key, Date.now() + ALLOWED_FOR_MS);
}

async function findImage(imageId: string) {
  const image = await db.query.images.findFirst({ where: and(eq(images.id, imageId), isNull(images.deletedAt)) });
  if (!image) throw new HttpError(404, 'Image not found');
  return image;
}

// Only images that no task uses can be deleted
export async function deleteImage(imageId: string) {
  await findImage(imageId);
  const [usedBy] = await db
    .select({ name: tasks.name })
    .from(taskImages)
    .innerJoin(tasks, eq(taskImages.taskId, tasks.id))
    .where(and(eq(taskImages.imageId, imageId), isNull(tasks.deletedAt)))
    .limit(1);
  if (usedBy) throw new HttpError(409, `Task "${usedBy.name}" uses this image. Remove it from the task first.`);

  await db.update(images).set({ deletedAt: new Date() }).where(eq(images.id, imageId));
  allowed.clear();
  await removeImageFiles(imageId);
}

export async function retryImage(imageId: string) {
  const image = await findImage(imageId);
  if (image.status !== 'FAILED') throw new HttpError(409, 'Only a failed image can be processed again');
  await db.update(images).set({ status: 'UPLOADED', errorMessage: null }).where(eq(images.id, imageId));
  queueImageProcessing(imageId);
  return getImage(imageId);
}

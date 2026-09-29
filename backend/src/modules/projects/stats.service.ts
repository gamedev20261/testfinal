import { and, count, eq, isNull, sql, desc } from 'drizzle-orm';
import { db } from '../../db/client';
import { tasks, labels, labelClasses, users, images } from '../../db/schema';

// Stats tab: progress of tasks, labels per class, work per annotator
export async function getProjectStats(projectId: string) {
  const liveTask = and(eq(tasks.projectId, projectId), isNull(tasks.deletedAt));
  const liveLabelInProject = and(liveTask, isNull(labels.deletedAt));

  const [tasksByStatus, labelsByReview, labelsByClass, byAnnotator, imageCounts] = await Promise.all([
    db.select({ status: tasks.status, count: count() }).from(tasks).where(liveTask).groupBy(tasks.status),

    db
      .select({ status: labels.reviewStatus, count: count() })
      .from(labels)
      .innerJoin(tasks, eq(labels.taskId, tasks.id))
      .where(liveLabelInProject)
      .groupBy(labels.reviewStatus),

    db
      .select({ id: labelClasses.id, name: labelClasses.name, color: labelClasses.color, count: count() })
      .from(labels)
      .innerJoin(tasks, eq(labels.taskId, tasks.id))
      .innerJoin(labelClasses, eq(labels.labelClassId, labelClasses.id))
      .where(liveLabelInProject)
      .groupBy(labelClasses.id)
      .orderBy(desc(count())),

    db
      .select({
        id: users.id,
        name: users.name,
        labels: count(labels.id),
        approved: sql<number>`count(*) FILTER (WHERE ${labels.reviewStatus} = 'APPROVED')::int`,
        rejected: sql<number>`count(*) FILTER (WHERE ${labels.reviewStatus} = 'REJECTED')::int`,
      })
      .from(labels)
      .innerJoin(tasks, eq(labels.taskId, tasks.id))
      .innerJoin(users, eq(labels.createdById, users.id))
      .where(liveLabelInProject)
      .groupBy(users.id)
      .orderBy(desc(count(labels.id))),

    db
      .select({ status: images.status, count: count() })
      .from(images)
      .where(and(eq(images.projectId, projectId), isNull(images.deletedAt)))
      .groupBy(images.status),
  ]);

  return {
    tasksByStatus: Object.fromEntries(tasksByStatus.map((row) => [row.status, row.count])),
    labelsByReview: Object.fromEntries(labelsByReview.map((row) => [row.status, row.count])),
    imagesByStatus: Object.fromEntries(imageCounts.map((row) => [row.status, row.count])),
    labelsByClass,
    byAnnotator,
  };
}

import { and, desc, eq, count } from 'drizzle-orm';
import { db } from '../../db/client';
import { notifications } from '../../db/schema';
import { logger } from '../../lib/logger';

export type NewNotification = {
  userId: string;
  type: 'TASK_ASSIGNED' | 'TASK_SUBMITTED' | 'TASK_PASSED' | 'TASK_FAILED' | 'IMAGE_REJECTED';
  title: string;
  message: string;
  link?: string;
};

// Never fails the request that triggered it: a lost notification is not worth an error
export async function notify(items: NewNotification[]) {
  if (items.length === 0) return;
  try {
    await db.insert(notifications).values(items);
  } catch (err) {
    logger.warn(err, 'Could not save notifications');
  }
}

export async function listNotifications(userId: string) {
  const [items, [{ unread }]] = await Promise.all([
    db.select().from(notifications).where(eq(notifications.userId, userId)).orderBy(desc(notifications.createdAt)).limit(50),
    db
      .select({ unread: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false))),
  ]);
  return { notifications: items, unreadCount: unread };
}

export async function markRead(userId: string, id: string) {
  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, id), eq(notifications.userId, userId)));
}

export async function markAllRead(userId: string) {
  await db.update(notifications).set({ isRead: true }).where(eq(notifications.userId, userId));
}

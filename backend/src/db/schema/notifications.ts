import { pgTable, uuid, text, boolean, index } from 'drizzle-orm/pg-core';
import { createdAt } from './columns';
import { users } from './users';

// Messages shown in the bell menu, e.g. "Task 'Sector A' failed review"
export const notifications = pgTable(
  'notifications',
  {
    id: uuid().primaryKey().defaultRandom(),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    type: text().notNull(), // TASK_ASSIGNED | TASK_SUBMITTED | TASK_PASSED | TASK_FAILED
    title: text().notNull(),
    message: text().notNull(),
    link: text(), // page to open, e.g. "/tasks/<id>"
    isRead: boolean().notNull().default(false),
    createdAt: createdAt(),
  },
  (t) => [index('notifications_user_idx').on(t.userId, t.isRead)],
);

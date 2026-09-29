import { pgTable, uuid, text, integer, timestamp, primaryKey, index } from 'drizzle-orm/pg-core';
import { taskStatusEnum, reviewStatusEnum } from './enums';
import { createdAt, updatedAt, deletedAt } from './columns';
import { projects } from './projects';
import { users } from './users';
import { images } from './images';

// A piece of work: some images of a project, one annotator who labels them, one auditor who checks
export const tasks = pgTable(
  'tasks',
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    name: text().notNull(),
    description: text().notNull().default(''),
    annotatorId: uuid()
      .notNull()
      .references(() => users.id),
    auditorId: uuid()
      .notNull()
      .references(() => users.id),
    status: taskStatusEnum().notNull().default('NOT_STARTED'),
    reviewComment: text(), // the auditor's reason when the task failed
    submittedAt: timestamp({ withTimezone: true }),
    reviewedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    index('tasks_project_idx').on(t.projectId),
    index('tasks_annotator_idx').on(t.annotatorId),
    index('tasks_auditor_idx').on(t.auditorId),
  ],
);

// The images inside a task, in order, each with the auditor's verdict
export const taskImages = pgTable(
  'task_images',
  {
    taskId: uuid()
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    imageId: uuid()
      .notNull()
      .references(() => images.id),
    position: integer().notNull().default(0),
    reviewStatus: reviewStatusEnum().notNull().default('PENDING'),
    reviewComment: text(),
  },
  (t) => [primaryKey({ columns: [t.taskId, t.imageId] })],
);

export type Task = typeof tasks.$inferSelect;

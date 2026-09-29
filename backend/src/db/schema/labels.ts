import { pgTable, uuid, text, timestamp, index } from 'drizzle-orm/pg-core';
import { shapeTypeEnum, reviewStatusEnum } from './enums';
import { createdAt, updatedAt, deletedAt } from './columns';
import { pixelGeometry } from './postgis';
import { tasks } from './tasks';
import { images } from './images';
import { labelClasses } from './label-classes';
import { users } from './users';

// One shape drawn by an annotator on one image of a task
export const labels = pgTable(
  'labels',
  {
    id: uuid().primaryKey().defaultRandom(),
    taskId: uuid()
      .notNull()
      .references(() => tasks.id, { onDelete: 'cascade' }),
    imageId: uuid()
      .notNull()
      .references(() => images.id),
    labelClassId: uuid()
      .notNull()
      .references(() => labelClasses.id),
    shapeType: shapeTypeEnum().notNull(),
    geom: pixelGeometry().notNull(), // read it with asGeoJson(labels.geom)
    createdById: uuid().references(() => users.id),
    reviewStatus: reviewStatusEnum().notNull().default('PENDING'),
    reviewComment: text(),
    reviewedById: uuid().references(() => users.id),
    reviewedAt: timestamp({ withTimezone: true }),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [
    index('labels_task_image_idx').on(t.taskId, t.imageId),
    index('labels_geom_idx').using('gist', t.geom), // fast "which shapes are here?" questions
  ],
);

export type Label = typeof labels.$inferSelect;

import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { createdAt, deletedAt } from './columns';

// Folders for label classes, e.g. "Buildings", "Transport"
export const labelGroups = pgTable('label_groups', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull().unique(),
  createdAt: createdAt(),
});

// What a shape can be: "House", "Road", "Tree"… Managed by admins, chosen per project.
export const labelClasses = pgTable(
  'label_classes',
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    color: text().notNull(), // "#e53e3e"
    groupId: uuid().references(() => labelGroups.id, { onDelete: 'set null' }),
    createdAt: createdAt(),
    deletedAt: deletedAt(),
  },
  (t) => [uniqueIndex('label_classes_name_unique').on(t.name).where(sql`${t.deletedAt} IS NULL`)],
);

export type LabelClass = typeof labelClasses.$inferSelect;

import { pgTable, uuid, text, primaryKey } from 'drizzle-orm/pg-core';
import { projectTypeEnum, projectStatusEnum } from './enums';
import { createdAt, updatedAt, deletedAt } from './columns';
import { users } from './users';
import { labelClasses } from './label-classes';

export const projects = pgTable('projects', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  description: text().notNull().default(''),
  type: projectTypeEnum().notNull().default('DETECTION'),
  status: projectStatusEnum().notNull().default('ACTIVE'),
  createdById: uuid().references(() => users.id),
  createdAt: createdAt(),
  updatedAt: updatedAt(),
  deletedAt: deletedAt(),
});

// Who works on a project (annotators and auditors). Admins see every project anyway.
export const projectMembers = pgTable(
  'project_members',
  {
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    userId: uuid()
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.userId] })],
);

// The label classes a project uses
export const projectLabelClasses = pgTable(
  'project_label_classes',
  {
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    labelClassId: uuid()
      .notNull()
      .references(() => labelClasses.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.labelClassId] })],
);

export type Project = typeof projects.$inferSelect;

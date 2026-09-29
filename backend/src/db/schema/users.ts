import { sql } from 'drizzle-orm';
import { pgTable, uuid, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { roleEnum } from './enums';
import { createdAt, updatedAt, deletedAt } from './columns';

// Teams of users, e.g. "Lahore office" (only for organising the users list)
export const userGroups = pgTable('user_groups', {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull().unique(),
  createdAt: createdAt(),
});

export const users = pgTable(
  'users',
  {
    id: uuid().primaryKey().defaultRandom(),
    name: text().notNull(),
    email: text().notNull(), // always stored in lowercase
    passwordHash: text().notNull(),
    role: roleEnum().notNull().default('ANNOTATOR'),
    groupId: uuid().references(() => userGroups.id, { onDelete: 'set null' }),
    // Logins made before this moment stop working (set on password or role change)
    sessionsValidAfter: timestamp({ withTimezone: true }).notNull().defaultNow(),
    createdAt: createdAt(),
    updatedAt: updatedAt(),
    deletedAt: deletedAt(),
  },
  (t) => [uniqueIndex('users_email_unique').on(t.email).where(sql`${t.deletedAt} IS NULL`)],
);

export type User = typeof users.$inferSelect;

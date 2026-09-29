import { timestamp } from 'drizzle-orm/pg-core';

// Columns that many tables share
export const createdAt = () => timestamp({ withTimezone: true }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp({ withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

// Soft delete: the row stays (other rows may point to it) but is hidden everywhere
export const deletedAt = () => timestamp({ withTimezone: true });

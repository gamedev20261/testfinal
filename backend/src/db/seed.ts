// `npm run db:seed`: creates the first admin, demo users and demo label classes.
// Safe to run more than once: existing rows are left unchanged.
import { z } from 'zod';
import { and, eq, isNull } from 'drizzle-orm';
import { db, pool } from './client';
import { users, labelGroups, labelClasses } from './schema';
import { hashPassword } from '../lib/password';
import { isProduction } from '../config/env';
import { errorMessage } from '../lib/error-message';

const settingsSchema = z.object({
  ADMIN_NAME: z.string().min(1).default('Administrator'),
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string().min(8, 'must be at least 8 characters'),
  DEMO_PASSWORD: z.string().min(8).default('ChangeMe123!'),
  SEED_DEMO_USERS: z.enum(['true', 'false']).default(isProduction ? 'false' : 'true'),
});

type NewUser = { name: string; email: string; password: string; role: 'ADMIN' | 'ANNOTATOR' | 'AUDITOR' };

async function createUserIfMissing(user: NewUser) {
  const email = user.email.toLowerCase();
  const existing = await db.query.users.findFirst({
    where: and(eq(users.email, email), isNull(users.deletedAt)),
  });
  if (existing) {
    console.log(`  ${user.role.padEnd(9)} ${email} already exists`);
    return;
  }
  await db.insert(users).values({
    name: user.name,
    email,
    role: user.role,
    passwordHash: await hashPassword(user.password),
  });
  console.log(`  ${user.role.padEnd(9)} ${email} created (password: ${user.password})`);
}

// A small starter library of label classes, only when there are none yet
async function createDemoLabelClasses() {
  const existing = await db.select({ id: labelClasses.id }).from(labelClasses).limit(1);
  if (existing.length > 0) return;

  const library = {
    Buildings: [['House', '#e53e3e'], ['Commercial building', '#dd6b20']],
    Transport: [['Road', '#718096'], ['Vehicle', '#3182ce']],
    Nature: [['Tree', '#38a169'], ['Water', '#0bc5ea']],
  };
  for (const [groupName, classes] of Object.entries(library)) {
    const [group] = await db.insert(labelGroups).values({ name: groupName }).returning();
    await db.insert(labelClasses).values(classes.map(([name, color]) => ({ name, color, groupId: group.id })));
  }
  console.log('  Created demo label classes (Buildings, Transport, Nature)');
}

async function main() {
  const result = settingsSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error('Invalid ADMIN_* settings in backend/.env:\n' + z.prettifyError(result.error));
  }
  const settings = result.data;

  console.log('Seeding:');
  await createUserIfMissing({
    name: settings.ADMIN_NAME,
    email: settings.ADMIN_EMAIL,
    password: settings.ADMIN_PASSWORD,
    role: 'ADMIN',
  });

  if (settings.SEED_DEMO_USERS === 'true') {
    await createUserIfMissing({ name: 'Ali Annotator', email: 'annotator@example.com', password: settings.DEMO_PASSWORD, role: 'ANNOTATOR' });
    await createUserIfMissing({ name: 'Sara Auditor', email: 'auditor@example.com', password: settings.DEMO_PASSWORD, role: 'AUDITOR' });
    await createDemoLabelClasses();
  }
}

main()
  .catch((error) => {
    const message = errorMessage(error);
    console.error(message.includes('does not exist') ? `${message}\n\nThe tables are missing: run "npm run db:migrate" first.` : message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

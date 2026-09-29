import { z } from 'zod';
import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/password';

// Creates the first administrator from the ADMIN_* settings in .env.
// Safe to run more than once: an existing account is left unchanged.

const adminSchema = z.object({
  ADMIN_NAME: z.string().min(1).default('Administrator'),
  ADMIN_EMAIL: z.email(),
  ADMIN_PASSWORD: z.string().min(8, 'must be at least 8 characters'),
});

async function main() {
  const result = adminSchema.safeParse(process.env);
  if (!result.success) {
    throw new Error('Invalid ADMIN_* settings in backend/.env:\n' + z.prettifyError(result.error));
  }
  const settings = result.data;
  const email = settings.ADMIN_EMAIL.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin ${email} already exists. Nothing to do.`);
    return;
  }

  await prisma.user.create({
    data: {
      name: settings.ADMIN_NAME,
      email,
      passwordHash: await hashPassword(settings.ADMIN_PASSWORD),
      role: 'ADMIN',
    },
  });
  console.log(`Created admin ${email}`);
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

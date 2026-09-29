import type { Role } from '../../generated/prisma/client';
import { prisma } from '../../lib/prisma';
import { verifyPassword } from '../../lib/password';
import { HttpError } from '../../lib/http-error';

// What the browser may know about a user. Never the passwordHash.
export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

// Tells Prisma to read only the PublicUser columns
export const publicUserFields = { id: true, name: true, email: true, role: true } as const;

// A real bcrypt hash of a random text. Checking a password against it takes as long as
// checking a real one, so response times don't reveal which emails exist.
const DUMMY_HASH = '$2b$12$fO7Kfnub1TksCy1cE4kid.iiWW/RGw.l76yNZYQZishxk5RNE3xo6';

// Returns the user when the email and password match, otherwise throws 401
export async function login(email: string, password: string): Promise<PublicUser> {
  const user = await prisma.user.findUnique({ where: { email } });

  const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  // One message for both cases, so nobody can test which emails have an account
  if (!user || !passwordOk) {
    throw new HttpError(401, 'Invalid email or password');
  }

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

// The user behind a session, or null if the account no longer exists
export function findPublicUser(id: string): Promise<PublicUser | null> {
  return prisma.user.findUnique({ where: { id }, select: publicUserFields });
}

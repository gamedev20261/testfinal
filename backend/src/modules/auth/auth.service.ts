import { and, eq, isNull } from 'drizzle-orm';
import { db } from '../../db/client';
import { users } from '../../db/schema';
import { hashPassword, verifyPassword } from '../../lib/password';
import { HttpError } from '../../lib/http-error';
import { sessionsValidFromNow } from '../../lib/session';

export type Role = 'ADMIN' | 'ANNOTATOR' | 'AUDITOR';

// What the browser may know about a user. Never the passwordHash.
export type PublicUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
};

// Tells Drizzle to read only the PublicUser columns
export const publicUserColumns = { id: users.id, name: users.name, email: users.email, role: users.role };

// A real bcrypt hash of a random text. Checking a password against it takes as long as
// checking a real one, so response times don't reveal which emails exist.
const DUMMY_HASH = '$2b$12$fO7Kfnub1TksCy1cE4kid.iiWW/RGw.l76yNZYQZishxk5RNE3xo6';

// Returns the user when the email and password match, otherwise throws 401
export async function login(email: string, password: string): Promise<PublicUser> {
  const user = await db.query.users.findFirst({
    where: and(eq(users.email, email), isNull(users.deletedAt)),
  });

  const passwordOk = await verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);

  // One message for both cases, so nobody can test which emails have an account
  if (!user || !passwordOk) {
    throw new HttpError(401, 'Invalid email or password');
  }

  return { id: user.id, name: user.name, email: user.email, role: user.role };
}

// The user behind a session, or null if the account is gone or the session was cut off
export async function findSessionUser(userId: string, issuedAt: Date): Promise<PublicUser | null> {
  const [user] = await db
    .select({ ...publicUserColumns, sessionsValidAfter: users.sessionsValidAfter })
    .from(users)
    .where(and(eq(users.id, userId), isNull(users.deletedAt)));

  if (!user || issuedAt < user.sessionsValidAfter) return null;
  const { sessionsValidAfter: _, ...publicUser } = user;
  return publicUser;
}

// Changes the password and ends every other login of this user
export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
  if (!user || !(await verifyPassword(currentPassword, user.passwordHash))) {
    throw new HttpError(400, 'Your current password is not correct');
  }
  await db
    .update(users)
    .set({ passwordHash: await hashPassword(newPassword), sessionsValidAfter: sessionsValidFromNow() })
    .where(eq(users.id, userId));
}

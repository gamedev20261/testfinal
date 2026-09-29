import bcrypt from 'bcryptjs';

// How much work one hash takes. Each +1 doubles the time; 12 is about 0.25 s.
// Slow on purpose: it makes guessing millions of passwords impractical.
const COST = 12;

// "ChangeMe123!" → "$2b$12$Wq3…" (a different result every time, because of the random salt)
export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, COST);
}

// true when `plain` is the password that produced `hash`
export function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

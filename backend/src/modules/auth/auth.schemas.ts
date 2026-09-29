import { z } from 'zod';

// POST /api/auth/login body: { "email": "...", "password": "..." }
export const loginSchema = z.object(
  {
    email: z
      .string({ error: 'Enter your email' })
      .trim()
      .toLowerCase() // emails are stored in lowercase
      .pipe(z.email('Enter a valid email address')),
    password: z.string({ error: 'Enter your password' }).min(1, 'Enter your password'),
  },
  { error: 'Send the email and password as JSON' },
);

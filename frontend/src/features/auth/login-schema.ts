import { z } from 'zod';

// The login form's rules, checked in the browser before anything is sent.
// The backend checks the same rules again (never trust the browser).
export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email').pipe(z.email('Enter a valid email address')),
  password: z.string().min(1, 'Enter your password'),
});

export type LoginValues = z.infer<typeof loginSchema>;

import { z } from 'zod';

// An email typed by a person: trimmed and lowercased before checking (emails are stored lowercase)
export const emailField = (requiredMessage = 'Enter an email') =>
  z
    .string({ error: requiredMessage })
    .trim()
    .toLowerCase()
    .pipe(z.email('Enter a valid email address'));

// Rules for any new password
export const newPasswordField = z
  .string({ error: 'Enter a password' })
  .min(8, 'The password must be at least 8 characters')
  .max(200, 'The password is too long');

// POST /api/auth/login body: { "email": "...", "password": "..." }
export const loginSchema = z.object(
  {
    email: emailField('Enter your email'),
    password: z.string({ error: 'Enter your password' }).min(1, 'Enter your password'),
  },
  { error: 'Send the email and password as JSON' },
);

// POST /api/auth/change-password body
export const changePasswordSchema = z.object({
  currentPassword: z.string({ error: 'Enter your current password' }).min(1, 'Enter your current password'),
  newPassword: newPasswordField,
});

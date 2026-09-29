import { z } from 'zod';
import { emailField, newPasswordField } from '../auth/auth.schemas';

const nameField = z.string({ error: 'Enter a name' }).trim().min(1, 'Enter a name').max(100, 'The name is too long');
const roleField = z.enum(['ADMIN', 'ANNOTATOR', 'AUDITOR'], { error: 'Choose a role' });
const groupField = z.uuid('Choose a valid group').nullable();

// POST /api/users
export const createUserSchema = z.object({
  name: nameField,
  email: emailField(),
  password: newPasswordField,
  role: roleField,
  groupId: groupField.optional(),
});

// PATCH /api/users/:id — every field is optional; only the ones sent are changed
export const updateUserSchema = z.object({
  name: nameField.optional(),
  email: emailField().optional(),
  password: newPasswordField.optional(),
  role: roleField.optional(),
  groupId: groupField.optional(),
});

// POST /api/user-groups, PATCH /api/user-groups/:id
export const groupSchema = z.object({
  name: z.string({ error: 'Enter a group name' }).trim().min(1, 'Enter a group name').max(100),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;
export type UpdateUserInput = z.infer<typeof updateUserSchema>;

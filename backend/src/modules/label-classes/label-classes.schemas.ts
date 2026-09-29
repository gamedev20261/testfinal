import { z } from 'zod';

const colorField = z
  .string({ error: 'Choose a colour' })
  .regex(/^#[0-9a-fA-F]{6}$/, 'The colour must look like #1b6ef3');

// POST /api/label-classes
export const createLabelClassSchema = z.object({
  name: z.string({ error: 'Enter a name' }).trim().min(1, 'Enter a name').max(100),
  color: colorField,
  groupId: z.uuid('Choose a valid group').nullable().optional(),
});

// PATCH /api/label-classes/:id
export const updateLabelClassSchema = createLabelClassSchema.partial();

// POST /api/label-groups, PATCH /api/label-groups/:id
export const labelGroupSchema = z.object({
  name: z.string({ error: 'Enter a group name' }).trim().min(1, 'Enter a group name').max(100),
});

export type CreateLabelClassInput = z.infer<typeof createLabelClassSchema>;
export type UpdateLabelClassInput = z.infer<typeof updateLabelClassSchema>;

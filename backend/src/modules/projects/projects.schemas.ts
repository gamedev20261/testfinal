import { z } from 'zod';

const ids = (message: string) => z.array(z.uuid(message)).max(1000);

// POST /api/projects
export const createProjectSchema = z.object({
  name: z.string({ error: 'Enter a project name' }).trim().min(1, 'Enter a project name').max(150),
  description: z.string().trim().max(2000).default(''),
  type: z.enum(['DETECTION', 'SEGMENTATION'], { error: 'Choose a project type' }),
  labelClassIds: ids('Choose valid label classes').default([]),
});

// PATCH /api/projects/:id
export const updateProjectSchema = z.object({
  name: z.string().trim().min(1, 'Enter a project name').max(150).optional(),
  description: z.string().trim().max(2000).optional(),
  type: z.enum(['DETECTION', 'SEGMENTATION']).optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
});

// POST /api/projects/:id/members
export const addMembersSchema = z.object({
  userIds: ids('Choose valid users').min(1, 'Choose at least one user'),
});

// PUT /api/projects/:id/label-classes
export const setLabelClassesSchema = z.object({
  labelClassIds: ids('Choose valid label classes'),
});

export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

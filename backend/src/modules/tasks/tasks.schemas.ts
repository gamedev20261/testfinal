import { z } from 'zod';

// POST /api/projects/:id/tasks
export const createTaskSchema = z.object({
  name: z.string({ error: 'Enter a task name' }).trim().min(1, 'Enter a task name').max(200),
  description: z.string().trim().max(2000).default(''),
  annotatorId: z.uuid({ error: 'Choose an annotator' }),
  auditorId: z.uuid({ error: 'Choose an auditor' }),
  imageIds: z.array(z.uuid('Choose valid images')).min(1, 'Choose at least one image').max(1000),
});

// PATCH /api/tasks/:id
export const updateTaskSchema = createTaskSchema.partial();

// POST /api/tasks/:id/review
export const reviewTaskSchema = z
  .object({
    result: z.enum(['PASSED', 'FAILED'], { error: 'Choose pass or fail' }),
    comment: z.string().trim().max(2000).default(''),
  })
  .refine((body) => body.result === 'PASSED' || body.comment.length > 0, {
    message: 'Tell the annotator why the task failed',
    path: ['comment'],
  });

// POST /api/tasks/:id/images/:imageId/review
export const reviewImageSchema = z
  .object({
    result: z.enum(['APPROVED', 'REJECTED'], { error: 'Choose approve or reject' }),
    comment: z.string().trim().max(2000).default(''),
  })
  .refine((body) => body.result === 'APPROVED' || body.comment.length > 0, {
    message: 'Tell the annotator what to fix on this image',
    path: ['comment'],
  });

export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type ReviewTaskInput = z.infer<typeof reviewTaskSchema>;
export type ReviewImageInput = z.infer<typeof reviewImageSchema>;

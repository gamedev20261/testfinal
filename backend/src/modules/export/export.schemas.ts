import { z } from 'zod';

// GET /api/projects/:id/export?format=YOLO&tasks=PASSED&chipSize=640&includeImages=true
export const exportSchema = z.object({
  format: z.enum(['YOLO', 'COCO', 'GEOJSON'], { error: 'Choose YOLO, COCO or GEOJSON' }),
  tasks: z.enum(['PASSED', 'ALL']).default('PASSED'), // only reviewed work, or everything
  chipSize: z.coerce
    .number()
    .refine((size) => [0, 256, 512, 640, 1024].includes(size), 'Chip size must be 0, 256, 512, 640 or 1024')
    .default(0), // 0 = whole images
  includeImages: z.stringbool().default(true),
});

export type ExportOptions = z.infer<typeof exportSchema>;

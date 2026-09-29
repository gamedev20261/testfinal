import { z } from 'zod';

// Shapes arrive as GeoJSON in image pixels: x to the right, y down from the top-left corner
const position = z.tuple([z.number().finite(), z.number().finite()]);

const point = z.object({ type: z.literal('Point'), coordinates: position });
const polygon = z.object({
  type: z.literal('Polygon'),
  // One outer ring, no holes
  coordinates: z.tuple([z.array(position).min(3, 'A polygon needs at least 3 points').max(5000)]),
});
const geometry = z.discriminatedUnion('type', [point, polygon], { error: 'Draw a shape' });

const shapeMatchesGeometry = (body: { shapeType?: string; geometry?: z.infer<typeof geometry> }) =>
  !body.shapeType || !body.geometry || (body.shapeType === 'POINT') === (body.geometry.type === 'Point');

// POST /api/tasks/:taskId/images/:imageId/labels
export const createLabelSchema = z
  .object({
    labelClassId: z.uuid({ error: 'Choose a label class' }),
    shapeType: z.enum(['BBOX', 'POLYGON', 'POINT'], { error: 'Choose a shape type' }),
    geometry,
  })
  .refine(shapeMatchesGeometry, { message: 'The shape does not match its type', path: ['geometry'] });

// PATCH /api/labels/:id (move, reshape or change class)
export const updateLabelSchema = z.object({
  labelClassId: z.uuid({ error: 'Choose a label class' }).optional(),
  geometry: geometry.optional(),
});

// POST /api/labels/:id/review
export const reviewLabelSchema = z.object({
  status: z.enum(['APPROVED', 'REJECTED'], { error: 'Choose approve or reject' }),
  comment: z.string().trim().max(1000).default(''),
});

export type ShapeGeometry = z.infer<typeof geometry>;
export type CreateLabelInput = z.infer<typeof createLabelSchema>;
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;
export type ReviewLabelInput = z.infer<typeof reviewLabelSchema>;

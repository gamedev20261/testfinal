import { z } from 'zod';
import { position, polygon } from './labels.schemas';

const coordinate = z.number().finite();

// POST /api/tasks/:taskId/images/:imageId/magic-wand
export const magicWandSchema = z.object({
  x: coordinate, // the clicked pixel
  y: coordinate,
  // How far (0-255, per colour channel) a pixel may be from the clicked colour to belong to the object
  tolerance: z.number().int().min(1).max(128).default(32),
  // The part of the image on screen, [minX, minY, maxX, maxY]: the object is searched inside it
  view: z.tuple([coordinate, coordinate, coordinate, coordinate]).optional(),
});

// POST /api/tasks/:taskId/images/:imageId/brush
export const brushSchema = z.object({
  stroke: z.array(position).min(1, 'Paint a stroke').max(5000), // the path of the brush centre
  radius: z.number().min(0.5).max(1000), // brush size in image pixels
  erase: z.boolean().default(false),
  base: polygon.optional(), // the selected polygon the stroke is added to or erased from
});

export type MagicWandInput = z.infer<typeof magicWandSchema>;
export type BrushInput = z.infer<typeof brushSchema>;

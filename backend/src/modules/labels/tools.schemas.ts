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

// POST /api/tasks/:taskId/images/:imageId/split
export const splitSchema = z.object({
  geometry: polygon, // the polygon to cut
  line: z.array(position).min(2, 'Draw a line across the shape').max(1000), // the cut, drawn across it
});

// POST /api/tasks/:taskId/images/:imageId/merge
export const mergeSchema = z.object({
  geometries: z.array(polygon).min(2, 'Choose two shapes to merge').max(20),
});

export type SplitInput = z.infer<typeof splitSchema>;
export type MergeInput = z.infer<typeof mergeSchema>;

import { z } from 'zod';

// Formats offered per project type
//   YOLO:     detection → one axis-aligned box per shape; segmentation → polygons (YOLO-seg)
//   YOLO_OBB: rotated boxes as 4 corners (Ultralytics OBB)
//   MASKS:    PNG masks, one per chip (colours = classes) or one black-and-white mask per class
export const EXPORT_FORMATS = {
  DETECTION: ['YOLO', 'YOLO_OBB', 'COCO', 'GEOJSON'],
  SEGMENTATION: ['MASKS', 'YOLO', 'COCO', 'GEOJSON'],
} as const;

export const MIN_CHIP_SIZE = 64;
export const MAX_CHIP_SIZE = 10_000;

// GET /api/projects/:id/export?format=MASKS&chipSize=512&mergeClasses=false&includeImages=true
// Only tasks that passed review are exported.
export const exportSchema = z.object({
  format: z.enum(['YOLO', 'YOLO_OBB', 'COCO', 'GEOJSON', 'MASKS'], { error: 'Choose YOLO, YOLO_OBB, COCO, GEOJSON or MASKS' }),
  chipSize: z.coerce
    .number()
    .int('The chip size must be a whole number of pixels')
    .refine(
      (size) => size === 0 || (size >= MIN_CHIP_SIZE && size <= MAX_CHIP_SIZE),
      `The chip size must be 0 (whole images) or ${MIN_CHIP_SIZE}–${MAX_CHIP_SIZE} pixels`,
    )
    .default(0), // 0 = whole images
  includeImages: z.stringbool().default(true),
  // Masks only: one colour mask for every class together, or a folder of black-and-white masks per class
  mergeClasses: z.stringbool().default(false),
});

export type ExportOptions = z.infer<typeof exportSchema>;

import { z } from 'zod';

// One dataset type per project type:
//   Object detection: YOLO_OBB (rotated boxes as 4 corners, Ultralytics) or VOC (Pascal VOC XML)
//   Segmentation:     MASKS (PNG masks), nothing to choose
export const EXPORT_FORMATS = {
  DETECTION: ['YOLO_OBB', 'VOC'],
  SEGMENTATION: ['MASKS'],
} as const;

export const MIN_CHIP_SIZE = 64;
export const MAX_CHIP_SIZE = 10_000;
export const MAX_AUGMENTED_COPIES = 10;

// Augmentations. Geometric ones move the pixels, so masks and boxes move with them;
// colour ones only change the pixels' colours.
export const GEOMETRIC_AUGMENTATIONS = ['FLIP_H', 'FLIP_V', 'ROTATE_90', 'ROTATE', 'ZOOM'] as const;
export const COLOR_AUGMENTATIONS = ['BRIGHTNESS', 'CONTRAST', 'SATURATION', 'HUE', 'BLUR', 'SHARPEN', 'NOISE', 'GRAYSCALE'] as const;

// "FLIP_H,ROTATE_90" → ['FLIP_H', 'ROTATE_90']
const listOf = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .string()
    .default('')
    .transform((text) => [...new Set(text.split(',').map((item) => item.trim()).filter(Boolean))])
    .pipe(z.array(z.enum(values, { error: `Choose from ${values.join(', ')}` })));

// GET /api/projects/:id/export?format=VOC&chipSize=512&augmentCopies=2&geometric=FLIP_H,ROTATE_90&color=BRIGHTNESS
// Only tasks that passed review are exported. The images (chips) are always included.
export const exportSchema = z
  .object({
    format: z.enum(['YOLO_OBB', 'VOC', 'MASKS'], { error: 'Choose YOLO_OBB, VOC or MASKS' }).optional(), // default: the project's first
    chipSize: z.coerce
      .number()
      .int('The chip size must be a whole number of pixels')
      .refine(
        (size) => size === 0 || (size >= MIN_CHIP_SIZE && size <= MAX_CHIP_SIZE),
        `The chip size must be 0 (whole images) or ${MIN_CHIP_SIZE}–${MAX_CHIP_SIZE} pixels`,
      )
      .default(0), // 0 = whole images
    // Masks only: one colour mask for every class together, or a folder of black-and-white masks per class
    mergeClasses: z.stringbool().default(false),
    // Extra augmented copies of every chip (0 = no augmentation)
    augmentCopies: z.coerce.number().int().min(0).max(MAX_AUGMENTED_COPIES).default(0),
    geometric: listOf(GEOMETRIC_AUGMENTATIONS),
    color: listOf(COLOR_AUGMENTATIONS),
  })
  .refine((options) => options.augmentCopies === 0 || options.geometric.length + options.color.length > 0, {
    message: 'Choose at least one augmentation, or 0 augmented copies',
    path: ['augmentCopies'],
  });

export type ExportOptions = z.infer<typeof exportSchema>;
export type ExportFormat = NonNullable<ExportOptions['format']>;
export type GeometricAugmentation = (typeof GEOMETRIC_AUGMENTATIONS)[number];
export type ColorAugmentation = (typeof COLOR_AUGMENTATIONS)[number];

import sharp from 'sharp';
import type { Position, PolygonGeometry } from '../../db/schema';
import type { ExportChip, ExportClass } from './export.writers';

// Segmentation masks: PNG images the size of the chip, background black.
//   merged:    one RGB mask per chip, each class painted in its own colour
//   per class: one black-and-white mask per chip and class, the class white

export type MaskClass = ExportClass & { color: string };

// A pixel belongs to a polygon when its centre is inside (even-odd rule). No anti-aliasing,
// so a mask only ever holds the exact class colours.
export function fillPolygon(target: Uint8Array, width: number, height: number, ring: Position[], value: number[]) {
  const channels = value.length;
  const ys = ring.map(([, y]) => y);
  const firstRow = Math.max(0, Math.floor(Math.min(...ys)));
  const lastRow = Math.min(height - 1, Math.ceil(Math.max(...ys)));
  for (let row = firstRow; row <= lastRow; row++) {
    const yc = row + 0.5;
    const crossings: number[] = [];
    for (let i = 0; i < ring.length - 1; i++) {
      const [[x1, y1], [x2, y2]] = [ring[i], ring[i + 1]];
      if ((y1 <= yc && yc < y2) || (y2 <= yc && yc < y1)) crossings.push(x1 + ((yc - y1) * (x2 - x1)) / (y2 - y1));
    }
    crossings.sort((a, b) => a - b);
    for (let i = 0; i + 1 < crossings.length; i += 2) {
      const from = Math.max(0, Math.ceil(crossings[i] - 0.5));
      const to = Math.min(width - 1, Math.ceil(crossings[i + 1] - 0.5) - 1);
      for (let x = from; x <= to; x++) {
        const p = (row * width + x) * channels;
        for (let c = 0; c < channels; c++) target[p + c] = value[c];
      }
    }
  }
}

const polygonsOf = (chip: ExportChip, classId?: string) =>
  chip.shapes
    .filter((shape) => shape.geometry.type === 'Polygon' && (!classId || shape.labelClassId === classId))
    .map((shape) => (shape.geometry as PolygonGeometry).coordinates[0]);

// 1 channel → an 8-bit greyscale PNG, 3 → RGB
const png = (pixels: Uint8Array, chip: ExportChip, channels: 1 | 3) =>
  sharp(pixels, { raw: { width: chip.width, height: chip.height, channels } })
    .toColourspace(channels === 1 ? 'b-w' : 'srgb')
    .png({ compressionLevel: 6 })
    .toBuffer();

export const hexToRgb = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

// Every class in its own colour; where shapes overlap, the one drawn last wins
export function mergedMask(chip: ExportChip, colorOf: Map<string, number[]>) {
  const pixels = new Uint8Array(chip.width * chip.height * 3);
  for (const shape of chip.shapes) {
    const color = colorOf.get(shape.labelClassId);
    if (color && shape.geometry.type === 'Polygon') fillPolygon(pixels, chip.width, chip.height, shape.geometry.coordinates[0], color);
  }
  return png(pixels, chip, 3);
}

// This class white, everything else black (all black when the class is not in the chip)
export function classMask(chip: ExportChip, classId: string) {
  const pixels = new Uint8Array(chip.width * chip.height);
  for (const ring of polygonsOf(chip, classId)) fillPolygon(pixels, chip.width, chip.height, ring, [255]);
  return png(pixels, chip, 1);
}

// classes.json: what each colour or folder means
export function maskLegend(classes: MaskClass[], folders: Map<string, string>, merged: boolean) {
  return {
    background: merged ? { rgb: [0, 0, 0] } : { value: 0 },
    classes: classes.map((labelClass) =>
      merged
        ? { name: labelClass.name, color: labelClass.color, rgb: hexToRgb(labelClass.color) }
        : { name: labelClass.name, folder: `masks/${folders.get(labelClass.id)}`, value: 255 },
    ),
  };
}

export function maskReadme(merged: boolean) {
  const lines = merged
    ? [
        'Segmentation masks, all classes merged',
        '',
        'images/<name>.jpg   the image chips',
        'masks/<name>.png    one mask per chip: black background, each class in its own colour',
        'classes.json        the colour of each class',
      ]
    : [
        'Segmentation masks, one folder per class',
        '',
        'images/<name>.jpg           the image chips',
        'masks/<class>/<name>.png    one mask per chip and class: the class white (255), everything else black (0)',
        'classes.json                the folder of each class',
      ];
  return [...lines, '', 'A mask has the same name and size as its image chip.', ''].join('\n');
}

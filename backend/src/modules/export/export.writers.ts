import type { Position, PolygonGeometry } from '../../db/schema';
import type { ChipShape } from './export.queries';

// Turn shapes into the text of each export format

export type ExportClass = { id: string; name: string };
export type ExportChip = { fileName: string; width: number; height: number; shapes: ChipShape[] };

const round = (value: number) => Math.round(value * 1e6) / 1e6;
const ring = (shape: ChipShape) => (shape.geometry as PolygonGeometry).coordinates[0].slice(0, -1); // without the closing point
const boxShapes = (chip: ExportChip) => chip.shapes.filter((shape) => shape.geometry.type === 'Polygon');

function bounds(points: Position[]) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const [minX, minY] = [Math.min(...xs), Math.min(...ys)];
  return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY };
}

// The smallest rectangle turned by `angle` (radians from the x axis) around the points, as 4 corners
export function orientedCorners(points: Position[], angle: number): Position[] {
  const [cos, sin] = [Math.cos(angle), Math.sin(angle)];
  const us = points.map(([x, y]) => x * cos + y * sin); // along the box's first side
  const vs = points.map(([x, y]) => -x * sin + y * cos); // across it
  const [u0, u1, v0, v1] = [Math.min(...us), Math.max(...us), Math.min(...vs), Math.max(...vs)];
  return [
    [u0, v0],
    [u1, v0],
    [u1, v1],
    [u0, v1],
  ].map(([u, v]): Position => [u * cos - v * sin, u * sin + v * cos]);
}

// YOLO wants every number between 0 and 1 (rotated corners may stick out of the chip a little)
const unit = (value: number) => round(Math.min(1, Math.max(0, value)));

// YOLO OBB (Ultralytics): one .txt per image, one line per shape, corners relative to the image size (0-1)
//   class x1 y1 x2 y2 x3 y3 x4 y4        (boxes are rotated boxes at angle 0)
export function yoloObbLines(chip: ExportChip, classIndex: Map<string, number>) {
  const lines: string[] = [];
  for (const shape of boxShapes(chip)) {
    const index = classIndex.get(shape.labelClassId);
    if (index === undefined) continue;
    const corners = orientedCorners(ring(shape), shape.angle).flatMap(([x, y]) => [unit(x / chip.width), unit(y / chip.height)]);
    lines.push([index, ...corners].join(' '));
  }
  return lines.join('\n');
}

export function yoloDataYaml(classes: ExportClass[]) {
  const names = classes.map((labelClass, index) => `  ${index}: ${JSON.stringify(labelClass.name)}`);
  return ['path: .', 'train: images', 'val: images', 'names:', ...names, ''].join('\n');
}

const xml = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const clamp = (value: number, low: number, high: number) => Math.min(high, Math.max(low, value));

// Pascal VOC: one XML per image. bndbox is the axis-aligned box in pixels (1-based, as in VOC).
// Rotated boxes also get a <robndbox> (centre, width, height, angle in radians, as roLabelImg writes it).
export function vocXml(chip: ExportChip, className: Map<string, string>) {
  const objects = boxShapes(chip).flatMap((shape) => {
    const name = className.get(shape.labelClassId);
    if (!name) return [];
    const points = ring(shape);
    const box = bounds(points);
    const lines = [
      '  <object>',
      `    <name>${xml(name)}</name>`,
      '    <pose>Unspecified</pose>',
      `    <truncated>${box.x <= 0 || box.y <= 0 || box.x + box.w >= chip.width || box.y + box.h >= chip.height ? 1 : 0}</truncated>`,
      '    <difficult>0</difficult>',
      '    <bndbox>',
      `      <xmin>${clamp(Math.round(box.x) + 1, 1, chip.width)}</xmin>`,
      `      <ymin>${clamp(Math.round(box.y) + 1, 1, chip.height)}</ymin>`,
      `      <xmax>${clamp(Math.round(box.x + box.w), 1, chip.width)}</xmax>`,
      `      <ymax>${clamp(Math.round(box.y + box.h), 1, chip.height)}</ymax>`,
      '    </bndbox>',
    ];
    if (shape.shapeType === 'OBB') {
      const [c0, c1, c2] = orientedCorners(points, shape.angle);
      const angle = ((shape.angle % Math.PI) + Math.PI) % Math.PI; // 0 ≤ angle < π
      lines.push(
        '    <robndbox>',
        `      <cx>${round((c0[0] + c2[0]) / 2)}</cx>`,
        `      <cy>${round((c0[1] + c2[1]) / 2)}</cy>`,
        `      <w>${round(Math.hypot(c1[0] - c0[0], c1[1] - c0[1]))}</w>`,
        `      <h>${round(Math.hypot(c2[0] - c1[0], c2[1] - c1[1]))}</h>`,
        `      <angle>${round(angle)}</angle>`,
        '    </robndbox>',
      );
    }
    lines.push('  </object>');
    return lines;
  });
  return [
    '<annotation>',
    '  <folder>JPEGImages</folder>',
    `  <filename>${xml(chip.fileName)}</filename>`,
    '  <source><database>GeoAnnotator</database></source>',
    `  <size><width>${chip.width}</width><height>${chip.height}</height><depth>3</depth></size>`,
    '  <segmented>0</segmented>',
    ...objects,
    '</annotation>',
    '',
  ].join('\n');
}

// A class name as one word ("Commercial building" → "Commercial_building"), for classes.txt
export const oneWord = (name: string) => name.trim().replace(/\s+/g, '_');

// classes.txt: one line per class, "id name" (the ids of YOLO's labels and data.yaml)
export function classesTxt(classes: ExportClass[]) {
  return [...classes.map((labelClass, index) => `${index} ${oneWord(labelClass.name)}`), ''].join('\n');
}

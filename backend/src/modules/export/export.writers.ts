import type { Position, PolygonGeometry } from '../../db/schema';
import type { ChipShape } from './export.queries';

// Turn shapes into the text of each export format

export type ExportClass = { id: string; name: string };
export type ExportChip = { fileName: string; width: number; height: number; shapes: ChipShape[] };

const round = (value: number) => Math.round(value * 1e6) / 1e6;
const ring = (shape: ChipShape) => (shape.geometry as PolygonGeometry).coordinates[0].slice(0, -1); // without the closing point

function bounds(points: Position[]) {
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const [minX, minY] = [Math.min(...xs), Math.min(...ys)];
  return { x: minX, y: minY, w: Math.max(...xs) - minX, h: Math.max(...ys) - minY };
}

// YOLO: one .txt per image, one line per shape, numbers relative to the image size (0-1)
//   detection:    class centerX centerY width height
//   segmentation: class x1 y1 x2 y2 x3 y3 ...
// Points have no YOLO form and are left out.
export function yoloLines(chip: ExportChip, classIndex: Map<string, number>, segmentation: boolean) {
  const lines: string[] = [];
  for (const shape of chip.shapes) {
    if (shape.shapeType === 'POINT') continue;
    const points = ring(shape);
    const index = classIndex.get(shape.labelClassId);
    if (index === undefined) continue;
    if (segmentation) {
      const xy = points.flatMap(([x, y]) => [round(x / chip.width), round(y / chip.height)]);
      lines.push([index, ...xy].join(' '));
    } else {
      const box = bounds(points);
      const center = [round((box.x + box.w / 2) / chip.width), round((box.y + box.h / 2) / chip.height)];
      lines.push([index, ...center, round(box.w / chip.width), round(box.h / chip.height)].join(' '));
    }
  }
  return lines.join('\n');
}

export function yoloDataYaml(classes: ExportClass[]) {
  const names = classes.map((labelClass, index) => `  ${index}: ${JSON.stringify(labelClass.name)}`);
  return ['path: .', 'train: images', 'val: images', 'names:', ...names, ''].join('\n');
}

// COCO: one annotations.json for all images, sizes in pixels
export function cocoJson(chips: ExportChip[], classes: ExportClass[]) {
  const categoryId = new Map(classes.map((labelClass, index) => [labelClass.id, index + 1]));
  const annotations: object[] = [];

  chips.forEach((chip, imageIndex) => {
    for (const shape of chip.shapes) {
      const category_id = categoryId.get(shape.labelClassId);
      if (!category_id) continue;
      const common = { id: annotations.length + 1, image_id: imageIndex + 1, category_id, iscrowd: 0 };
      if (shape.geometry.type === 'Point') {
        const [x, y] = shape.geometry.coordinates;
        annotations.push({ ...common, bbox: [x, y, 0, 0], area: 0, segmentation: [], keypoints: [x, y, 2], num_keypoints: 1 });
        continue;
      }
      const points = ring(shape);
      const box = bounds(points);
      annotations.push({
        ...common,
        bbox: [box.x, box.y, box.w, box.h].map(round),
        area: round(polygonArea(points)),
        segmentation: shape.shapeType === 'POLYGON' ? [points.flat().map(round)] : [],
      });
    }
  });

  return {
    info: { description: 'Exported from GeoAnnotator', date_created: new Date().toISOString() },
    images: chips.map((chip, index) => ({ id: index + 1, file_name: chip.fileName, width: chip.width, height: chip.height })),
    categories: classes.map((labelClass, index) => ({ id: index + 1, name: labelClass.name })),
    annotations,
  };
}

// Shoelace formula
function polygonArea(points: Position[]) {
  let sum = 0;
  points.forEach(([x1, y1], i) => {
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  });
  return Math.abs(sum) / 2;
}

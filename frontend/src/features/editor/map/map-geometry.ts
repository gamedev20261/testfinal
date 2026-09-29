import Point from 'ol/geom/Point';
import Polygon, { fromExtent } from 'ol/geom/Polygon';
import { boundingExtent } from 'ol/extent';
import type { Coordinate } from 'ol/coordinate';
import type { Position, ShapeGeometry } from '../../../types/label';

// Image pixels have y going down; OpenLayers (like a map) has y going up.
// So the pixel (x, y) is drawn at (x, -y).
const flip = ([x, y]: Coordinate): Position => [x, -y];
const round = ([x, y]: Position): Position => [Math.round(x * 100) / 100, Math.round(y * 100) / 100];

export function toOlGeometry(geometry: ShapeGeometry) {
  if (geometry.type === 'Point') return new Point(flip(geometry.coordinates));
  return new Polygon(geometry.coordinates.map((ring) => ring.map(flip)));
}

export function toShapeGeometry(geometry: Point | Polygon): ShapeGeometry {
  if (geometry instanceof Point) return { type: 'Point', coordinates: round(flip(geometry.getCoordinates())) };
  return { type: 'Polygon', coordinates: geometry.getCoordinates().map((ring) => ring.map((c) => round(flip(c)))) };
}

// OpenLayers lets you drag one corner of a box, which bends it.
// Afterwards we rebuild the rectangle between the dragged corner and the opposite one.
export function straightenBox(before: Polygon, after: Polygon): Polygon {
  const [old] = before.getCoordinates();
  const [now] = after.getCoordinates();
  const moved = now.findIndex((c, i) => i < 4 && (c[0] !== old[i][0] || c[1] !== old[i][1]));
  if (moved < 0) return after;
  return fromExtent(boundingExtent([now[moved], old[(moved + 2) % 4]]));
}

// Area in pixels², to ignore accidental clicks with the box tool
export const isTiny = (geometry: ShapeGeometry) =>
  geometry.type === 'Polygon' && new Polygon(geometry.coordinates).getArea() < 4;

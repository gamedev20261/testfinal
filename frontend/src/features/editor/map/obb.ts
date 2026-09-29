import Polygon from 'ol/geom/Polygon';
import type { Coordinate } from 'ol/coordinate';
import type { GeometryFunction } from 'ol/interaction/Draw';

// Rotated boxes (OBB): a polygon of 4 corners. Its first side (corner 0 → corner 1) sets the angle.

const sub = (a: Coordinate, b: Coordinate) => [a[0] - b[0], a[1] - b[1]];
const add = (a: Coordinate, b: Coordinate, scale = 1) => [a[0] + b[0] * scale, a[1] + b[1] * scale];
const dot = (a: Coordinate, b: Coordinate) => a[0] * b[0] + a[1] * b[1];
const unit = (v: Coordinate) => {
  const length = Math.hypot(v[0], v[1]) || 1;
  return [v[0] / length, v[1] / length];
};

// Click 1 and 2: one side of the box. Click 3: how far the box reaches across it.
function rectangleFrom([a, b, c]: Coordinate[]) {
  if (!c) return [a, b, b, a];
  const across = unit([a[1] - b[1], b[0] - a[0]]); // perpendicular to the first side
  const depth = dot(sub(c, a), across);
  return [a, b, add(b, across, depth), add(a, across, depth)];
}

// For Draw with type 'LineString' and maxPoints 3: shows the box while the corners are clicked
export const rotatedBoxFromClicks: GeometryFunction = (coordinates, geometry) => {
  const corners = rectangleFrom(coordinates as Coordinate[]);
  const ring = [...corners, corners[0]];
  if (!geometry) return new Polygon([ring]);
  (geometry as Polygon).setCoordinates([ring]);
  return geometry;
};

const cornersOf = (polygon: Polygon) => polygon.getCoordinates()[0].slice(0, 4);

export const boxCenter = (polygon: Polygon) => {
  const corners = cornersOf(polygon);
  return [corners.reduce((sum, c) => sum + c[0], 0) / 4, corners.reduce((sum, c) => sum + c[1], 0) / 4];
};

// Dragging one corner bends the box. Rebuild the rectangle between the dragged corner
// and the opposite one, keeping the box's angle.
export function straightenRotatedBox(before: Polygon, after: Polygon): Polygon {
  const old = cornersOf(before);
  const now = cornersOf(after);
  const moved = now.findIndex((c, i) => c[0] !== old[i][0] || c[1] !== old[i][1]);
  if (moved < 0) return after;
  const opposite = (moved + 2) % 4;
  const along = unit(sub(old[1], old[0]));
  const across = unit(sub(old[3], old[0]));
  const fixed = old[opposite];
  const diagonal = sub(now[moved], fixed);
  const [a, b] = [dot(diagonal, along), dot(diagonal, across)];

  const corners: Coordinate[] = [];
  corners[opposite] = fixed;
  corners[moved] = add(add(fixed, along, a), across, b);
  // From the fixed corner, the next side runs along the first side when the fixed corner is 0 or 2
  const [next, previous] = [(opposite + 1) % 4, (opposite + 3) % 4];
  corners[next] = opposite % 2 === 0 ? add(fixed, along, a) : add(fixed, across, b);
  corners[previous] = opposite % 2 === 0 ? add(fixed, across, b) : add(fixed, along, a);
  return new Polygon([[...corners, corners[0]]]);
}

// The round handle that turns a selected rotated box: outside the middle of its first side
export function rotationHandle(polygon: Polygon, resolution: number, distancePx = 22) {
  const [c0, c1] = cornersOf(polygon);
  const middle = [(c0[0] + c1[0]) / 2, (c0[1] + c1[1]) / 2];
  const outward = unit(sub(middle, boxCenter(polygon)));
  return { middle, handle: add(middle, outward, distancePx * resolution) };
}

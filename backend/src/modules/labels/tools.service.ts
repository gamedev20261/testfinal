import sharp from 'sharp';
import { sql, type SQL } from 'drizzle-orm';
import { db } from '../../db/client';
import type { PolygonGeometry } from '../../db/schema';
import { HttpError } from '../../lib/http-error';
import { imageFile, DISPLAY_FILE } from '../../lib/storage';
import { findTaskForUser, assertCanEditLabels } from '../../permissions/access';
import { SHARP_OPTIONS } from '../images/processing/read-raster';
import type { PublicUser } from '../auth/auth.service';
import { findTaskImage } from './labels.service';
import { growRegion, openRegion, traceOutline, countInside } from './magic-wand';
import type { MagicWandInput, BrushInput, SplitInput, MergeInput } from './tools.schemas';

// Segmentation helpers. They only compute a polygon; the editor then saves it like a drawn one
// (so undo, validation and review work the same).

const MIN_WINDOW = 512; // image pixels looked at around the click, at least…
const MAX_WINDOW = 8192; // …and at most (per side)
const WORK_SIZE = 2048; // larger windows are shrunk to this before searching
const MAX_POINTS = 5000; // a label's polygon limit

async function editableImage(user: PublicUser, taskId: string, imageId: string) {
  const { task, role } = await findTaskForUser(user, taskId);
  assertCanEditLabels(task, role);
  return findTaskImage(taskId, imageId);
}

// Magic pen: the object under the click, found by its colour, as a polygon
export async function magicWand(user: PublicUser, taskId: string, imageId: string, input: MagicWandInput) {
  const size = await editableImage(user, taskId, imageId);
  if (input.x < 0 || input.y < 0 || input.x >= size.width || input.y >= size.height) {
    throw new HttpError(400, 'Click inside the image');
  }

  const area = searchWindow(input, size.width, size.height);
  const scale = Math.min(1, WORK_SIZE / Math.max(area.width, area.height));
  const image = sharp(imageFile(imageId, DISPLAY_FILE), SHARP_OPTIONS).extract(area);
  if (scale < 1) image.resize(Math.max(1, Math.round(area.width * scale)), Math.max(1, Math.round(area.height * scale)));
  // A small median filter first, so the texture of roofs or trees doesn't break the object up
  const { data, info } = await image.median(3).removeAlpha().raw().toBuffer({ resolveWithObject: true });

  const seedX = Math.min(info.width - 1, Math.floor((input.x - area.left) * (info.width / area.width)));
  const seedY = Math.min(info.height - 1, Math.floor((input.y - area.top) * (info.height / area.height)));
  const grown = growRegion(data, info.width, info.height, info.channels, seedX, seedY, input.tolerance);
  const region = openRegion(grown, info.width, info.height, seedX, seedY);

  const pixels = countInside(region);
  if (pixels < 4) throw new HttpError(400, 'No object found here. Raise the tolerance, or zoom in and click inside the object.');
  if (pixels > 0.95 * info.width * info.height) {
    throw new HttpError(400, 'The magic pen selected almost everything in view. Lower the tolerance or zoom in.');
  }

  // Outline in window pixels → image pixels
  const [sx, sy] = [area.width / info.width, area.height / info.height];
  const ring = traceOutline(region, info.width, info.height).map(([x, y]) => [area.left + x * sx, area.top + y * sy]);
  const outline = { type: 'Polygon', coordinates: [ring] };
  const geometry = await tidyPolygon(sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(outline)}), 0)`, size, 0.75 * sx);
  if (!geometry) throw new HttpError(400, 'No object found here. Raise the tolerance.');
  return geometry;
}

// Where to look: what is on screen, but at least MIN_WINDOW and at most MAX_WINDOW around the click
function searchWindow({ x, y, view }: MagicWandInput, width: number, height: number) {
  const [viewMinX, viewMinY, viewMaxX, viewMaxY] = view ?? [x, y, x, y];
  const minX = Math.max(Math.min(viewMinX, x - MIN_WINDOW / 2), x - MAX_WINDOW / 2, 0);
  const minY = Math.max(Math.min(viewMinY, y - MIN_WINDOW / 2), y - MAX_WINDOW / 2, 0);
  const maxX = Math.min(Math.max(viewMaxX, x + MIN_WINDOW / 2), x + MAX_WINDOW / 2, width);
  const maxY = Math.min(Math.max(viewMaxY, y + MIN_WINDOW / 2), y + MAX_WINDOW / 2, height);
  const left = Math.floor(minX);
  const top = Math.floor(minY);
  return { left, top, width: Math.max(1, Math.ceil(maxX) - left), height: Math.max(1, Math.ceil(maxY) - top) };
}

export type BrushResult =
  | { action: 'create' | 'update'; geometry: PolygonGeometry }
  | { action: 'delete' | 'none'; geometry?: undefined };

// Brush: a stroke is a line widened by the brush radius. With a selected polygon (base) it is
// added to it, or erased from it; otherwise it becomes a new polygon.
export async function brushStroke(user: PublicUser, taskId: string, imageId: string, input: BrushInput): Promise<BrushResult> {
  const size = await editableImage(user, taskId, imageId);
  if (input.erase && !input.base) throw new HttpError(400, 'Select a shape to erase from');

  const line = input.stroke.length === 1 ? { type: 'Point', coordinates: input.stroke[0] } : { type: 'LineString', coordinates: input.stroke };
  const stroke = sql`ST_Buffer(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(line)}), 0), ${input.radius}::float8, 'quad_segs=8')`;
  const tolerance = Math.max(0.2, input.radius / 20);

  const newShape = async (): Promise<BrushResult> => {
    const geometry = await tidyPolygon(stroke, size, tolerance);
    if (!geometry) throw new HttpError(400, 'Paint inside the image');
    return { action: 'create', geometry };
  };
  if (!input.base) return newShape();

  const base = sql`ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(input.base)}), 0))`;
  const { rows } = await db.execute<{ touches: boolean }>(sql`SELECT ST_Intersects(${base}, ${stroke}) AS touches`);
  if (!rows[0].touches) return input.erase ? { action: 'none' } : newShape();

  const combined = input.erase ? sql`ST_Difference(${base}, ${stroke})` : sql`ST_Union(${base}, ${stroke})`;
  const geometry = await tidyPolygon(combined, size, tolerance);
  if (!geometry) return { action: 'delete' }; // everything was erased
  return { action: 'update', geometry };
}

const asGeometry = (geojson: object) => sql`ST_MakeValid(ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(geojson)}), 0))`;

// Cut: the polygon split along a line drawn across it. The pieces, largest first.
export async function splitPolygon(user: PublicUser, taskId: string, imageId: string, input: SplitInput) {
  await editableImage(user, taskId, imageId);
  const line = asGeometry({ type: 'LineString', coordinates: input.line });
  const { rows } = await db.execute<{ geojson: PolygonGeometry }>(sql`
    SELECT ST_AsGeoJSON(ST_MakePolygon(ST_ExteriorRing(part.geom)), 3)::json AS geojson
    FROM ST_Dump(ST_CollectionExtract(ST_Split(${asGeometry(input.geometry)}, ${line}), 3)) part
    WHERE ST_Area(part.geom) >= 1
    ORDER BY ST_Area(part.geom) DESC
  `);
  if (rows.length < 2) throw new HttpError(400, 'Draw the cut all the way across the shape, from outside to outside');
  return rows.map((row) => row.geojson);
}

// Merge: shapes that touch or overlap become one polygon (holes between them are filled)
export async function mergePolygons(user: PublicUser, taskId: string, imageId: string, input: MergeInput) {
  const size = await editableImage(user, taskId, imageId);
  const union = sql`ST_Union(ARRAY[${sql.join(input.geometries.map(asGeometry), sql`, `)}])`;
  const { rows } = await db.execute<{ parts: number }>(sql`
    SELECT count(*)::int AS parts FROM ST_Dump(ST_CollectionExtract(${union}, 3)) part WHERE ST_Area(part.geom) >= 1
  `);
  if (rows[0].parts !== 1) throw new HttpError(400, 'Only shapes that touch or overlap can be merged');
  const geometry = await tidyPolygon(union, size, 0.2);
  if (!geometry) throw new HttpError(400, 'Only shapes that touch or overlap can be merged');
  return geometry;
}

// Makes any outline a label polygon: valid, cut to the image, its largest piece without holes,
// simplified (tolerance in pixels) until it has at most MAX_POINTS corners. Null when nothing is left.
async function tidyPolygon(geometry: SQL, size: { width: number; height: number }, tolerance: number) {
  const { rows } = await db.execute<{ geojson: PolygonGeometry; points: number }>(sql`
    WITH piece AS (
      SELECT ST_MakePolygon(ST_ExteriorRing(part.geom)) AS g
      FROM ST_Dump(ST_CollectionExtract(
        ST_Intersection(ST_MakeValid(${geometry}), ST_MakeEnvelope(0, 0, ${size.width}, ${size.height}, 0)), 3
      )) part
      WHERE ST_Area(part.geom) >= 1
      ORDER BY ST_Area(part.geom) DESC LIMIT 1
    ), simple AS (
      SELECT ST_SimplifyPreserveTopology(g, ${tolerance}::float8 * 2 ^ attempt) AS g, attempt
      FROM piece, generate_series(0, 6) attempt
    )
    SELECT ST_AsGeoJSON(g, 3)::json AS geojson, ST_NPoints(g) AS points
    FROM simple
    WHERE ST_NPoints(g) <= ${MAX_POINTS} OR attempt = 6
    ORDER BY attempt LIMIT 1
  `);
  return rows[0]?.geojson ?? null;
}

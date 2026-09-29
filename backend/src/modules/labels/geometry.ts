import { sql } from 'drizzle-orm';
import { db } from '../../db/client';
import type { Geometry } from '../../db/schema';
import { HttpError } from '../../lib/http-error';
import type { ShapeGeometry } from './labels.schemas';

type ShapeType = 'BBOX' | 'POLYGON' | 'POINT';

const shapeName = { BBOX: 'box', POLYGON: 'polygon', POINT: 'point' } as const;

// Checks a drawn shape with PostGIS and cuts it to the image edges.
//   Box:     made axis-aligned (its envelope)
//   Polygon: must not cross itself; if cutting splits it, the largest piece is kept
//   Point:   must be on the image
export async function cleanShape(shapeType: ShapeType, geometry: ShapeGeometry, width: number, height: number) {
  const json = JSON.stringify(closeRing(geometry));
  const { rows } = await db.execute<{ valid: boolean; geojson: Geometry | null }>(sql`
    WITH drawn AS (
      SELECT CASE WHEN ${shapeType} = 'BBOX' THEN ST_Envelope(g) ELSE g END AS g
      FROM (SELECT ST_SetSRID(ST_GeomFromGeoJSON(${json}), 0) AS g) input
    ), cut AS (
      SELECT g, ST_IsValid(g) AS valid,
        CASE WHEN ST_IsValid(g) THEN ST_Intersection(g, ST_MakeEnvelope(0, 0, ${width}, ${height}, 0)) END AS inside
      FROM drawn
    )
    SELECT valid,
      CASE
        WHEN GeometryType(g) = 'POINT' THEN (CASE WHEN ST_IsEmpty(inside) THEN NULL ELSE ST_AsGeoJSON(g)::json END)
        ELSE (
          SELECT ST_AsGeoJSON(piece.geom)::json FROM ST_Dump(ST_CollectionExtract(inside, 3)) piece
          WHERE ST_Area(piece.geom) >= 1 ORDER BY ST_Area(piece.geom) DESC LIMIT 1
        )
      END AS geojson
    FROM cut
  `);
  const [result] = rows;
  if (!result.valid) throw new HttpError(400, 'The polygon crosses itself. Redraw it.');
  if (!result.geojson) throw new HttpError(400, `The ${shapeName[shapeType]} is outside the image or too small`);
  return result.geojson;
}

// Polygons must end where they start
function closeRing(geometry: ShapeGeometry): ShapeGeometry {
  if (geometry.type !== 'Polygon') return geometry;
  const ring = geometry.coordinates[0];
  const [first, last] = [ring[0], ring[ring.length - 1]];
  const closed = first[0] === last[0] && first[1] === last[1] ? ring : [...ring, first];
  return { type: 'Polygon', coordinates: [closed] };
}

// Boxes and polygons may not sit inside (or around) another box or polygon of the same image.
// 1 pixel of tolerance, so shapes that share an edge are fine.
export async function assertNotNested(opts: {
  taskId: string;
  imageId: string;
  shapeType: ShapeType;
  geometry: Geometry;
  exceptLabelId?: string;
}) {
  if (opts.shapeType === 'POINT') return;
  const json = JSON.stringify(opts.geometry);
  const { rows } = await db.execute<{ shape_type: ShapeType; is_inside: boolean }>(sql`
    WITH drawn AS (SELECT ST_SetSRID(ST_GeomFromGeoJSON(${json}), 0) AS g)
    SELECT l.shape_type, ST_Covers(ST_Buffer(l.geom, 1), drawn.g) AS is_inside
    FROM labels l, drawn
    WHERE l.task_id = ${opts.taskId} AND l.image_id = ${opts.imageId}
      AND l.deleted_at IS NULL AND l.shape_type <> 'POINT'
      AND l.id <> ${opts.exceptLabelId ?? '00000000-0000-0000-0000-000000000000'}
      AND l.geom && ST_Expand(drawn.g, 1)
      AND (ST_Covers(ST_Buffer(l.geom, 1), drawn.g) OR ST_Covers(ST_Buffer(drawn.g, 1), l.geom))
    LIMIT 1
  `);
  const [conflict] = rows;
  if (!conflict) return;
  const mine = shapeName[opts.shapeType];
  const other = shapeName[conflict.shape_type];
  throw new HttpError(
    400,
    conflict.is_inside ? `This ${mine} is inside another ${other}` : `This ${mine} would contain another ${other}`,
  );
}

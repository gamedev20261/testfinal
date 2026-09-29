import { sql } from 'drizzle-orm';
import { db } from '../../db/client';
import type { Geometry } from '../../db/schema';

export type ShapeType = 'BBOX' | 'OBB' | 'POLYGON' | 'POINT';
export type ExportImage = { id: string; originalName: string; width: number; height: number; labelCount: number };
// angle: direction of a rotated box's first side (radians from the x axis, y down); 0 for other shapes
export type ChipShape = { x0: number; y0: number; labelClassId: string; shapeType: ShapeType; angle: number; geometry: Geometry };

// Only work that passed review becomes a dataset
const passedTasks = (projectId: string) => sql`
  SELECT t.id FROM tasks t WHERE t.project_id = ${projectId} AND t.deleted_at IS NULL AND t.status = 'PASSED'
`;

// Shapes that go into an export: live, not rejected, of passed tasks
const exportedShapes = (projectId: string) => sql`
  SELECT l.* FROM labels l
  WHERE l.task_id IN (${passedTasks(projectId)}) AND l.deleted_at IS NULL AND l.review_status <> 'REJECTED'
`;

export async function countPassedTasks(projectId: string) {
  const { rows } = await db.execute<{ count: number }>(sql`SELECT count(*)::int AS count FROM (${passedTasks(projectId)}) t`);
  return rows[0].count;
}

// Ready images that belong to passed tasks
export async function findExportImages(projectId: string) {
  const { rows } = await db.execute<ExportImage>(sql`
    SELECT i.id, i.original_name AS "originalName", i.width, i.height,
      (SELECT count(*)::int FROM (${exportedShapes(projectId)}) s WHERE s.image_id = i.id) AS "labelCount"
    FROM images i
    WHERE i.deleted_at IS NULL AND i.status = 'READY' AND i.id IN (
      SELECT ti.image_id FROM task_images ti WHERE ti.task_id IN (${passedTasks(projectId)})
    )
    ORDER BY i.original_name
  `);
  return rows;
}

// Cuts the image into chips (squares of chipSize, the last row/column pushed back inside the image)
// and returns each shape's piece inside each chip, in chip pixels, in drawing order.
// chipSize 0 = one chip, the whole image.
export async function findChipShapes(projectId: string, image: ExportImage, chipSize: number) {
  const chipW = chipSize > 0 ? Math.min(chipSize, image.width) : image.width;
  const chipH = chipSize > 0 ? Math.min(chipSize, image.height) : image.height;
  const { rows } = await db.execute<ChipShape>(sql`
    WITH chips AS (
      SELECT DISTINCT LEAST(x, ${image.width - chipW}::int) AS x0, LEAST(y, ${image.height - chipH}::int) AS y0
      FROM generate_series(0, ${image.width - 1}::int, ${chipW}::int) x,
           generate_series(0, ${image.height - 1}::int, ${chipH}::int) y
    ), shapes AS (
      SELECT s.*, CASE WHEN s.shape_type = 'OBB' THEN (
        SELECT atan2(ST_Y(ST_PointN(r, 2)) - ST_Y(ST_PointN(r, 1)), ST_X(ST_PointN(r, 2)) - ST_X(ST_PointN(r, 1)))
        FROM (SELECT ST_ExteriorRing(s.geom) AS r) ring
      ) ELSE 0 END AS angle
      FROM (${exportedShapes(projectId)}) s WHERE s.image_id = ${image.id}
    ), pieces AS (
      SELECT c.x0, c.y0, s.label_class_id, s.shape_type, s.angle, s.created_at,
        (ST_Dump(ST_Intersection(s.geom, ST_MakeEnvelope(c.x0, c.y0, c.x0 + ${chipW}::int, c.y0 + ${chipH}::int, 0)))).geom AS g
      FROM chips c JOIN shapes s ON s.geom && ST_MakeEnvelope(c.x0, c.y0, c.x0 + ${chipW}::int, c.y0 + ${chipH}::int, 0)
    )
    SELECT x0, y0, label_class_id AS "labelClassId", shape_type AS "shapeType", angle,
      ST_AsGeoJSON(ST_Translate(CASE WHEN shape_type = 'BBOX' THEN ST_Envelope(g) ELSE g END, -x0, -y0))::json AS geometry
    FROM pieces
    WHERE (shape_type = 'POINT' AND GeometryType(g) = 'POINT')
       OR (shape_type <> 'POINT' AND GeometryType(g) = 'POLYGON' AND ST_Area(g) >= 1)
    ORDER BY y0, x0, created_at
  `);
  return { chipW, chipH, shapes: rows };
}

// For GeoJSON: every shape of the image placed on the map.
//   GDAL geotransform → ST_Affine(a, b, d, e, xoff, yoff) = (gt1, gt2, gt4, gt5, gt0, gt3)
//   (PostgreSQL arrays start at 1, so gt[2] is gt1)
export async function findMapShapes(projectId: string, imageId: string) {
  const { rows } = await db.execute<{
    id: string;
    className: string;
    color: string;
    shapeType: ShapeType;
    reviewStatus: string;
    taskName: string;
    geometry: Geometry;
  }>(sql`
    SELECT s.id, lc.name AS "className", lc.color, s.shape_type AS "shapeType",
      s.review_status AS "reviewStatus", t.name AS "taskName",
      ST_AsGeoJSON(CASE
        WHEN i.footprint IS NOT NULL THEN ST_Transform(ST_SetSRID(
          ST_Affine(s.geom, gt[2], gt[3], gt[5], gt[6], gt[1], gt[4]), i.srid), 4326)
        WHEN gt IS NOT NULL THEN ST_Affine(s.geom, gt[2], gt[3], gt[5], gt[6], gt[1], gt[4])
        ELSE s.geom
      END, 9)::json AS geometry
    FROM (${exportedShapes(projectId)}) s
    JOIN images i ON i.id = s.image_id
    CROSS JOIN LATERAL (SELECT i.geo_transform AS gt) g
    JOIN label_classes lc ON lc.id = s.label_class_id
    JOIN tasks t ON t.id = s.task_id
    WHERE s.image_id = ${imageId}
    ORDER BY s.created_at
  `);
  return rows;
}

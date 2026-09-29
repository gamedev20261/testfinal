import { customType } from 'drizzle-orm/pg-core';
import { sql, type SQL, type AnyColumn } from 'drizzle-orm';

// GeoJSON geometries we store. Coordinates are [x, y].
export type Position = [number, number];
export type PointGeometry = { type: 'Point'; coordinates: Position };
export type PolygonGeometry = { type: 'Polygon'; coordinates: Position[][] };
export type Geometry = PointGeometry | PolygonGeometry;

// A shape in image pixels: x to the right, y down, (0, 0) = top-left corner of the image.
// SRID 0 tells PostGIS it is a flat x/y plane, not a place on Earth.
export const pixelGeometry = customType<{ data: Geometry; driverData: string }>({
  dataType: () => 'geometry(Geometry, 0)',
  toDriver: (value) => sql`ST_SetSRID(ST_GeomFromGeoJSON(${JSON.stringify(value)}), 0)`,
});

// A polygon on Earth in longitude/latitude (EPSG:4326), e.g. the area a GeoTIFF covers
export const lonLatPolygon = customType<{ data: PolygonGeometry; driverData: string }>({
  dataType: () => 'geometry(Polygon, 4326)',
});

// Read a geometry column back as GeoJSON (always use this instead of selecting the column itself)
export function asGeoJson<T extends Geometry = Geometry>(column: AnyColumn | SQL): SQL<T> {
  return sql<T>`ST_AsGeoJSON(${column})::json`;
}

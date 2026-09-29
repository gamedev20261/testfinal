import { pgTable, uuid, text, integer, bigint, doublePrecision, index } from 'drizzle-orm/pg-core';
import { imageStatusEnum } from './enums';
import { createdAt, deletedAt } from './columns';
import { lonLatPolygon } from './postgis';
import { projects } from './projects';
import { users } from './users';

// An uploaded satellite/aerial image. Its files live in uploads/images/<id>/.
export const images = pgTable(
  'images',
  {
    id: uuid().primaryKey().defaultRandom(),
    projectId: uuid()
      .notNull()
      .references(() => projects.id, { onDelete: 'cascade' }),
    originalName: text().notNull(),
    sizeBytes: bigint({ mode: 'number' }).notNull().default(0),
    status: imageStatusEnum().notNull().default('UPLOADED'),
    errorMessage: text(),
    width: integer(), // pixels, known after processing
    height: integer(),
    // Georeferencing (GeoTIFFs only): pixel → map coordinates, the GDAL "geotransform"
    //   mapX = gt[0] + px * gt[1] + py * gt[2];  mapY = gt[3] + px * gt[4] + py * gt[5]
    geoTransform: doublePrecision().array(),
    srid: integer(), // EPSG code of the map coordinates, e.g. 32643 (UTM 43N)
    footprint: lonLatPolygon(), // the area the image covers, in longitude/latitude
    uploadedById: uuid().references(() => users.id),
    createdAt: createdAt(),
    deletedAt: deletedAt(),
  },
  (t) => [index('images_project_idx').on(t.projectId), index('images_footprint_idx').using('gist', t.footprint)],
);

export type Image = typeof images.$inferSelect;

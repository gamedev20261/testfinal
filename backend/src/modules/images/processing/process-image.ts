import { rm } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../../../db/client';
import { images, type Image } from '../../../db/schema';
import { logger } from '../../../lib/logger';
import { imageFile, originalName, DISPLAY_FILE, THUMB_FILE, PREVIEW_FILE, TILES_DIR } from '../../../lib/storage';
import { openAsRgb, SHARP_OPTIONS } from './read-raster';
import { readGeoreference, footprintWkt } from './georeference';

// Turns an uploaded file into everything the app shows:
// display.tif → thumb.jpg, preview.jpg and the editor's map tiles.
export async function processImage(imageId: string) {
  const image = await db.query.images.findFirst({ where: and(eq(images.id, imageId), isNull(images.deletedAt)) });
  if (!image || image.status === 'READY') return; // deleted, or already done

  await db.update(images).set({ status: 'PROCESSING', errorMessage: null }).where(eq(images.id, imageId));
  const started = Date.now();
  try {
    const { width, height } = await makeFiles(image);
    await db.update(images).set({ width, height }).where(eq(images.id, imageId));
    await saveGeoreference(image, width, height);
    await db.update(images).set({ status: 'READY' }).where(eq(images.id, imageId));
    logger.info(`Image ready: ${image.originalName} (${width} × ${height}, ${Date.now() - started} ms)`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn(`Image failed: ${image.originalName}: ${message}`);
    await db.update(images).set({ status: 'FAILED', errorMessage: message }).where(eq(images.id, imageId));
  }
}

export const originalPath = (image: Pick<Image, 'id' | 'originalName'>) =>
  originalName(image.id, path.extname(image.originalName).toLowerCase());

async function makeFiles(image: Image) {
  const display = imageFile(image.id, DISPLAY_FILE);
  const rgb = await openAsRgb(originalPath(image));
  const info = await rgb.tiff({ compression: 'jpeg', quality: 90, tile: true, tileWidth: 512, tileHeight: 512 }).toFile(display);

  const fromDisplay = () => sharp(display, SHARP_OPTIONS);
  await fromDisplay().resize(400, 400, { fit: 'inside' }).jpeg({ quality: 80 }).toFile(imageFile(image.id, THUMB_FILE));
  await fromDisplay()
    .resize(2048, 2048, { fit: 'inside', withoutEnlargement: true })
    .jpeg({ quality: 85 })
    .toFile(imageFile(image.id, PREVIEW_FILE));

  // Zoomify tiles: tiles/ImageProperties.xml + tiles/TileGroupN/<zoom>-<x>-<y>.jpg
  const tiles = imageFile(image.id, TILES_DIR);
  await rm(tiles, { recursive: true, force: true });
  await fromDisplay().jpeg({ quality: 85 }).tile({ size: 256, layout: 'zoomify' }).toFile(tiles);

  return { width: info.width, height: info.height };
}

// GeoTIFFs only: remember the pixel → map transform and the area covered
async function saveGeoreference(image: Image, width: number, height: number) {
  if (!/\.tiff?$/i.test(image.originalName)) return;
  const georef = await readGeoreference(originalPath(image)).catch(() => null);
  if (!georef) return;

  await db.update(images).set(georef).where(eq(images.id, image.id));
  if (!georef.srid) return;
  try {
    const wkt = footprintWkt(georef.geoTransform, width, height);
    await db
      .update(images)
      .set({ footprint: sql`ST_Transform(ST_SetSRID(ST_GeomFromText(${wkt}), ${georef.srid}::int), 4326)` })
      .where(eq(images.id, image.id));
  } catch (err) {
    logger.warn(`No footprint for ${image.originalName} (EPSG:${georef.srid}): ${(err as Error).message}`);
  }
}

import { mkdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { and, eq, isNull, sql } from 'drizzle-orm';
import { db } from '../../../db/client';
import { images, type Image } from '../../../db/schema';
import { logger } from '../../../lib/logger';
import { imageFile, originalName, DISPLAY_FILE, STRETCHED_FILE, THUMB_FILE, PREVIEW_FILE, TILES_DIR } from '../../../lib/storage';
import { describeTiff, isPlain8bit, isServableCog, rgbPipeline, stretchedPipeline, writeStretchedRgb } from './read-raster';
import { imagePropertiesXml, readLevels, readRegion, savePyramid } from './pyramid';
import { readGeoreference, footprintWkt } from './georeference';

// Turns an uploaded file into everything the app shows (see makeFiles)
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

// Makes the COG-style file the app reads, its pyramid.json, the thumbnail and the preview.
// No map tiles are made here: they are cut on first use (processing a 100 GB image stays one pass).
async function makeFiles(image: Image) {
  const original = originalPath(image);
  const info = await describeTiff(original);
  const tiles = imageFile(image.id, TILES_DIR);
  await rm(tiles, { recursive: true, force: true });
  await rm(imageFile(image.id, DISPLAY_FILE), { force: true });

  let source = path.basename(original);
  if (!isServableCog(info)) {
    // Not already a COG: one streaming pass into a tiled, JPEG-compressed TIFF with overviews
    source = DISPLAY_FILE;
    const stretched = imageFile(image.id, STRETCHED_FILE);
    try {
      let pipeline;
      if (isPlain8bit(info)) pipeline = rgbPipeline(original);
      else if (info.samples <= 4) pipeline = await stretchedPipeline(original, info);
      else {
        await writeStretchedRgb(original, stretched);
        pipeline = rgbPipeline(stretched);
      }
      await pipeline
        .tiff({ compression: 'jpeg', quality: 88, tile: true, tileWidth: 512, tileHeight: 512, pyramid: true, bigtiff: true })
        .toFile(imageFile(image.id, DISPLAY_FILE));
    } finally {
      await rm(stretched, { force: true });
    }
  }

  const levels = await readLevels(imageFile(image.id, source));
  const { width, height } = levels[0];
  await savePyramid(image.id, { source, width, height, levels });
  await mkdir(tiles, { recursive: true });
  await writeFile(imageFile(image.id, `${TILES_DIR}/ImageProperties.xml`), imagePropertiesXml(width, height));

  // Preview and thumbnail from a small overview, not from the full image
  const fit = Math.min(1, 2048 / Math.max(width, height));
  const preview = await (await readRegion(image.id, { left: 0, top: 0, width, height }, Math.max(1, Math.round(width * fit)), Math.max(1, Math.round(height * fit))))
    .jpeg({ quality: 85 })
    .toBuffer();
  await writeFile(imageFile(image.id, PREVIEW_FILE), preview);
  await sharp(preview).resize(400, 400, { fit: 'inside' }).jpeg({ quality: 80 }).toFile(imageFile(image.id, THUMB_FILE));
  return { width, height };
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

import { readFile, writeFile, rename, mkdir, access } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { fromFile } from 'geotiff';
import { imageFile, DISPLAY_FILE, PYRAMID_FILE, TILES_DIR } from '../../../lib/storage';
import { SHARP_OPTIONS } from './read-raster';

// The image the app reads from is a COG-style TIFF: tiled, with overviews (smaller copies) inside.
// pyramid.json says which file it is and where each level is:
//   { "source": "original.tif" | "display.tif", "width", "height", "levels": [{ "page", "width", "height" }] }
// Map tiles are cut from the right level when the editor first asks for them, then kept on disk.

export type Level = { page: number; width: number; height: number };
export type Pyramid = { source: string; width: number; height: number; levels: Level[] };

const TILE = 256; // Zoomify tile size (what the editor's map expects)

// The levels of a tiled TIFF, largest first (libvips "page" = the TIFF directory number)
export async function readLevels(file: string): Promise<Level[]> {
  const tiff = await fromFile(file);
  try {
    const levels: Level[] = [];
    for (let page = 0; page < (await tiff.getImageCount()); page++) {
      const image = await tiff.getImage(page);
      const subfile = (image.fileDirectory.getValue('NewSubfileType') as number | undefined) ?? 0;
      if (!(subfile & 4)) levels.push({ page, width: image.getWidth(), height: image.getHeight() }); // 4 = mask
    }
    return levels.sort((a, b) => b.width - a.width);
  } finally {
    await tiff.close();
  }
}

export async function savePyramid(imageId: string, pyramid: Pyramid) {
  await writeFile(imageFile(imageId, PYRAMID_FILE), JSON.stringify(pyramid));
  known.delete(imageId);
}

const known = new Map<string, Pyramid>();

// Images processed before pyramids existed have only display.tif (one level)
export async function readPyramid(imageId: string): Promise<Pyramid> {
  const cached = known.get(imageId);
  if (cached) return cached;
  let pyramid: Pyramid;
  try {
    pyramid = JSON.parse(await readFile(imageFile(imageId, PYRAMID_FILE), 'utf8'));
  } catch {
    const levels = await readLevels(imageFile(imageId, DISPLAY_FILE));
    pyramid = { source: DISPLAY_FILE, width: levels[0].width, height: levels[0].height, levels };
  }
  if (known.size > 1000) known.clear();
  known.set(imageId, pyramid);
  return pyramid;
}

// The full-resolution 8-bit RGB file of an image (for exports and the magic pen)
export const displayFile = async (imageId: string) => imageFile(imageId, (await readPyramid(imageId)).source);

// A region of the full-resolution image, read from the smallest level that is still sharp enough
export async function readRegion(
  imageId: string,
  region: { left: number; top: number; width: number; height: number },
  outWidth: number,
  outHeight: number,
) {
  const pyramid = await readPyramid(imageId);
  const scale = region.width / outWidth; // full-resolution pixels per output pixel
  const level = [...pyramid.levels].reverse().find((l) => pyramid.width / l.width <= scale * 1.01) ?? pyramid.levels[0];
  const f = level.width / pyramid.width;
  const left = Math.min(level.width - 1, Math.floor(region.left * f));
  const top = Math.min(level.height - 1, Math.floor(region.top * f));
  const width = Math.max(1, Math.min(level.width - left, Math.round(region.width * f)));
  const height = Math.max(1, Math.min(level.height - top, Math.round(region.height * f)));
  return sharp(imageFile(imageId, pyramid.source), { ...SHARP_OPTIONS, page: level.page })
    .extract({ left, top, width, height })
    .resize(outWidth, outHeight, { fit: 'fill' })
    .removeAlpha()
    .toColourspace('srgb');
}

// Zoomify tiers as OpenLayers computes them: the full image at tier `top`, each tier below half as sharp
function tierCount(width: number, height: number) {
  let tiers = 1;
  for (let size = TILE; size < width || size < height; size *= 2) tiers++;
  return tiers;
}

export const imagePropertiesXml = (width: number, height: number) =>
  `<IMAGE_PROPERTIES WIDTH="${width}" HEIGHT="${height}" NUMTILES="0" NUMIMAGES="1" VERSION="1.8" TILESIZE="${TILE}" />`;

const making = new Map<string, Promise<string | null>>();

// The file of Zoomify tile z-x-y (cut and saved on first use). Null when the tile is outside the image.
export async function zoomifyTile(imageId: string, z: number, x: number, y: number): Promise<string | null> {
  const file = imageFile(imageId, `${TILES_DIR}/${z}-${x}-${y}.jpg`);
  if (await exists(file)) return file;
  const key = `${imageId}/${z}-${x}-${y}`;
  if (!making.has(key)) making.set(key, makeTile(imageId, z, x, y, file).finally(() => making.delete(key)));
  return making.get(key)!;
}

async function makeTile(imageId: string, z: number, x: number, y: number, file: string) {
  const { width, height } = await readPyramid(imageId);
  const tiers = tierCount(width, height);
  if (z >= tiers) return null;
  const scale = 2 ** (tiers - 1 - z); // full-resolution pixels per tile pixel
  const [left, top] = [x * TILE * scale, y * TILE * scale];
  if (left >= width || top >= height) return null;
  const region = { left, top, width: Math.min(TILE * scale, width - left), height: Math.min(TILE * scale, height - top) };
  const jpeg = await (await readRegion(imageId, region, Math.ceil(region.width / scale), Math.ceil(region.height / scale)))
    .jpeg({ quality: 85 })
    .toBuffer();
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.${process.pid}.tmp`;
  await writeFile(temporary, jpeg);
  await rename(temporary, file); // never serve a half-written tile
  return file;
}

const exists = (file: string) => access(file).then(() => true, () => false);

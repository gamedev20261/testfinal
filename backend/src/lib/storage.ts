import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { env } from '../config/env';

// Where files live on disk:
//   uploads/tmp/                 files being uploaded
//   uploads/images/<id>/         one folder per image:
//     original.tif               the file as uploaded
//     display.tif                8-bit RGB copy used for tiles and exports
//     thumb.jpg, preview.jpg     small pictures for lists and cards
//     tiles/                     Zoomify map tiles for the editor

export const uploadRoot = path.resolve(env.UPLOAD_DIR);
export const tmpDir = path.join(uploadRoot, 'tmp');

export const imageDir = (imageId: string) => path.join(uploadRoot, 'images', imageId);
export const imageFile = (imageId: string, name: string) => path.join(imageDir(imageId), name);

export const originalName = (imageId: string, ext: string) => imageFile(imageId, `original${ext}`);
export const DISPLAY_FILE = 'display.tif';
export const THUMB_FILE = 'thumb.jpg';
export const PREVIEW_FILE = 'preview.jpg';
export const TILES_DIR = 'tiles';

// At startup. Leftovers in tmp/ are uploads that never finished.
export async function ensureUploadFolders() {
  await rm(tmpDir, { recursive: true, force: true });
  await mkdir(tmpDir, { recursive: true });
  await mkdir(path.join(uploadRoot, 'images'), { recursive: true });
}

export async function removeImageFiles(imageId: string) {
  await rm(imageDir(imageId), { recursive: true, force: true });
}

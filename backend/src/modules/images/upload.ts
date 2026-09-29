import path from 'node:path';
import { open, rm } from 'node:fs/promises';
import multer from 'multer';
import { env } from '../../config/env';
import { HttpError } from '../../lib/http-error';
import { tmpDir } from '../../lib/storage';

// Only TIFF / GeoTIFF images can be uploaded
export const IMAGE_EXTENSIONS = ['.tif', '.tiff'];

// Receives the "files" field of a multipart form into uploads/tmp/
export const uploadImages = multer({
  dest: tmpDir,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 50 },
  fileFilter: (_req, file, accept) => {
    // Browsers send the name as UTF-8, multer reads it as latin1
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(file.originalname).toLowerCase();
    if (IMAGE_EXTENSIONS.includes(ext)) accept(null, true);
    else accept(new HttpError(400, `${file.originalname}: only TIFF images (${IMAGE_EXTENSIONS.join(', ')}) can be uploaded`));
  },
}).array('files', 50);

// TIFF files start with "II*\0" (little-endian), "MM\0*" (big-endian) or the BigTIFF variants
const TIFF_HEADERS = ['49492a00', '4d4d002a', '49492b00', '4d4d002b'];

// The name says .tif; the first bytes must agree (a renamed JPEG is refused)
export async function assertTiffFiles(files: Express.Multer.File[]) {
  for (const file of files) {
    const handle = await open(file.path, 'r');
    try {
      const { buffer, bytesRead } = await handle.read(Buffer.alloc(4), 0, 4, 0);
      if (bytesRead < 4 || !TIFF_HEADERS.includes(buffer.toString('hex'))) {
        throw new HttpError(400, `${file.originalname} is not a TIFF image`);
      }
    } finally {
      await handle.close();
    }
  }
}

export const uploadedFiles = (files: unknown) => (Array.isArray(files) ? (files as Express.Multer.File[]) : []);

export async function removeTempFiles(files: Express.Multer.File[]) {
  await Promise.all(files.map((file) => rm(file.path, { force: true })));
}

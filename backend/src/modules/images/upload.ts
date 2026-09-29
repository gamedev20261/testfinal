import path from 'node:path';
import { rm } from 'node:fs/promises';
import multer from 'multer';
import { env } from '../../config/env';
import { HttpError } from '../../lib/http-error';
import { tmpDir } from '../../lib/storage';

export const IMAGE_EXTENSIONS = ['.tif', '.tiff', '.jpg', '.jpeg', '.png'];

// Receives the "files" field of a multipart form into uploads/tmp/
export const uploadImages = multer({
  dest: tmpDir,
  limits: { fileSize: env.MAX_UPLOAD_MB * 1024 * 1024, files: 50 },
  fileFilter: (_req, file, accept) => {
    // Browsers send the name as UTF-8, multer reads it as latin1
    file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(file.originalname).toLowerCase();
    if (IMAGE_EXTENSIONS.includes(ext)) accept(null, true);
    else accept(new HttpError(400, `${file.originalname}: only ${IMAGE_EXTENSIONS.join(', ')} files can be uploaded`));
  },
}).array('files', 50);

export const uploadedFiles = (files: unknown) => (Array.isArray(files) ? (files as Express.Multer.File[]) : []);

export async function removeTempFiles(files: Express.Multer.File[]) {
  await Promise.all(files.map((file) => rm(file.path, { force: true })));
}

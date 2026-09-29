import { Router, type Response } from 'express';
import { requireAuth } from '../../middleware/require-auth';
import { requireRole } from '../../middleware/require-role';
import { idParam } from '../../lib/params';
import { HttpError } from '../../lib/http-error';
import { imageFile, THUMB_FILE, PREVIEW_FILE, TILES_DIR } from '../../lib/storage';
import { assertCanViewImage, getImage, deleteImage, retryImage } from './images.service';

// Project image lists and uploads are in projects.routes.ts (/api/projects/:id/images)
export const imagesRouter = Router();
imagesRouter.use(requireAuth);

const admin = requireRole('ADMIN');

imagesRouter.get('/:id', async (req, res) => {
  const imageId = idParam(req.params.id, 'Image');
  await assertCanViewImage(req.user!, imageId);
  res.json({ image: await getImage(imageId) });
});

imagesRouter.get('/:id/thumbnail', async (req, res) => {
  const imageId = idParam(req.params.id, 'Image');
  await assertCanViewImage(req.user!, imageId);
  await sendImageFile(res, imageFile(imageId, THUMB_FILE));
});

imagesRouter.get('/:id/preview', async (req, res) => {
  const imageId = idParam(req.params.id, 'Image');
  await assertCanViewImage(req.user!, imageId);
  await sendImageFile(res, imageFile(imageId, PREVIEW_FILE));
});

// Zoomify tiles for the editor: /tiles/ImageProperties.xml and /tiles/TileGroup0/2-1-0.jpg
imagesRouter.get('/:id/tiles/ImageProperties.xml', async (req, res) => {
  const imageId = idParam(req.params.id, 'Image');
  await assertCanViewImage(req.user!, imageId);
  await sendImageFile(res, imageFile(imageId, `${TILES_DIR}/ImageProperties.xml`));
});

imagesRouter.get('/:id/tiles/:group/:tile', async (req, res) => {
  const imageId = idParam(req.params.id, 'Image');
  const { group, tile } = req.params;
  // Strict names, so nobody can ask for ../../something
  if (!/^TileGroup\d+$/.test(group) || !/^\d+-\d+-\d+\.jpg$/.test(tile)) throw new HttpError(404, 'Tile not found');
  await assertCanViewImage(req.user!, imageId);
  await sendImageFile(res, imageFile(imageId, `${TILES_DIR}/${group}/${tile}`));
});

imagesRouter.delete('/:id', admin, async (req, res) => {
  await deleteImage(idParam(req.params.id, 'Image'));
  res.status(204).end();
});

imagesRouter.post('/:id/retry', admin, async (req, res) => {
  res.json({ image: await retryImage(idParam(req.params.id, 'Image')) });
});

// Files of an image never change, so the browser may keep them for a day
function sendImageFile(res: Response, file: string) {
  return new Promise<void>((resolve, reject) => {
    res.sendFile(file, { cacheControl: false, headers: { 'Cache-Control': 'private, max-age=86400' } }, (err) => {
      if (!err) resolve();
      else if (res.headersSent) resolve();
      else reject(new HttpError(404, 'File not found (the image may still be processing)'));
    });
  });
}

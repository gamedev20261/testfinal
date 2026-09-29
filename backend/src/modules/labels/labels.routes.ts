import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth';
import { idParam } from '../../lib/params';
import { updateLabelSchema, reviewLabelSchema } from './labels.schemas';
import { updateLabel, deleteLabel, restoreLabel, reviewLabel } from './labels.service';

// One shape. Listing and drawing new ones: /api/tasks/:id/images/:imageId/labels
export const labelsRouter = Router();
labelsRouter.use(requireAuth);

labelsRouter.patch('/:id', async (req, res) => {
  res.json({ label: await updateLabel(req.user!, idParam(req.params.id, 'Shape'), updateLabelSchema.parse(req.body)) });
});

labelsRouter.delete('/:id', async (req, res) => {
  await deleteLabel(req.user!, idParam(req.params.id, 'Shape'));
  res.status(204).end();
});

labelsRouter.post('/:id/restore', async (req, res) => {
  res.json({ label: await restoreLabel(req.user!, idParam(req.params.id, 'Shape')) });
});

labelsRouter.post('/:id/review', async (req, res) => {
  res.json({ label: await reviewLabel(req.user!, idParam(req.params.id, 'Shape'), reviewLabelSchema.parse(req.body)) });
});

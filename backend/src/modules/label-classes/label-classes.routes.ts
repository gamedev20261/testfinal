import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth';
import { requireRole } from '../../middleware/require-role';
import { idParam } from '../../lib/params';
import { createLabelClassSchema, updateLabelClassSchema, labelGroupSchema } from './label-classes.schemas';
import {
  listLabelClasses,
  createLabelClass,
  updateLabelClass,
  deleteLabelClass,
  listLabelGroups,
  createLabelGroup,
  renameLabelGroup,
  deleteLabelGroup,
} from './label-classes.service';

// Admin Settings → Label Classes tab. Everyone may read, only admins may change.
export const labelClassesRouter = Router();
labelClassesRouter.use(requireAuth);

labelClassesRouter.get('/', async (_req, res) => {
  res.json({ labelClasses: await listLabelClasses() });
});

labelClassesRouter.post('/', requireRole('ADMIN'), async (req, res) => {
  const labelClass = await createLabelClass(createLabelClassSchema.parse(req.body));
  res.status(201).json({ labelClass });
});

labelClassesRouter.patch('/:id', requireRole('ADMIN'), async (req, res) => {
  const labelClass = await updateLabelClass(idParam(req.params.id, 'Label class'), updateLabelClassSchema.parse(req.body));
  res.json({ labelClass });
});

labelClassesRouter.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  await deleteLabelClass(idParam(req.params.id, 'Label class'));
  res.status(204).end();
});

export const labelGroupsRouter = Router();
labelGroupsRouter.use(requireAuth);

labelGroupsRouter.get('/', async (_req, res) => {
  res.json({ groups: await listLabelGroups() });
});

labelGroupsRouter.post('/', requireRole('ADMIN'), async (req, res) => {
  const group = await createLabelGroup(labelGroupSchema.parse(req.body).name);
  res.status(201).json({ group });
});

labelGroupsRouter.patch('/:id', requireRole('ADMIN'), async (req, res) => {
  const group = await renameLabelGroup(idParam(req.params.id, 'Group'), labelGroupSchema.parse(req.body).name);
  res.json({ group });
});

labelGroupsRouter.delete('/:id', requireRole('ADMIN'), async (req, res) => {
  await deleteLabelGroup(idParam(req.params.id, 'Group'));
  res.status(204).end();
});

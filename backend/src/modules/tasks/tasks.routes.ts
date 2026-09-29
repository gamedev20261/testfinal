import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth';
import { requireRole } from '../../middleware/require-role';
import { idParam } from '../../lib/params';
import { findTaskForUser, assertCanReview } from '../../permissions/access';
import { updateTaskSchema, reviewTaskSchema, reviewImageSchema } from './tasks.schemas';
import { listMyTasks, getTaskDetail, updateTask, deleteTask } from './tasks.service';
import { startTask, submitTask, reviewTask, reviewImage, approvePendingLabels } from './workflow.service';
import { listLabels, createLabel } from '../labels/labels.service';
import { createLabelSchema } from '../labels/labels.schemas';
import { magicWandSchema, brushSchema } from '../labels/tools.schemas';
import { magicWand, brushStroke } from '../labels/tools.service';

// Task lists and creation per project are in projects.routes.ts (/api/projects/:id/tasks)
export const tasksRouter = Router();
tasksRouter.use(requireAuth);

const admin = requireRole('ADMIN');

// Tasks I annotate or review (admins: all tasks)
tasksRouter.get('/mine', async (req, res) => {
  res.json({ tasks: await listMyTasks(req.user!) });
});

tasksRouter.get('/:id', async (req, res) => {
  res.json(await getTaskDetail(req.user!, idParam(req.params.id, 'Task')));
});

tasksRouter.patch('/:id', admin, async (req, res) => {
  const task = await updateTask(idParam(req.params.id, 'Task'), updateTaskSchema.parse(req.body));
  res.json({ task });
});

tasksRouter.delete('/:id', admin, async (req, res) => {
  await deleteTask(idParam(req.params.id, 'Task'));
  res.status(204).end();
});

// ── Workflow ──

tasksRouter.post('/:id/start', async (req, res) => {
  const { task, role } = await findTaskForUser(req.user!, idParam(req.params.id, 'Task'));
  res.json({ task: await startTask(task, role) });
});

tasksRouter.post('/:id/submit', async (req, res) => {
  const { task, role } = await findTaskForUser(req.user!, idParam(req.params.id, 'Task'));
  res.json({ task: await submitTask(task, role) });
});

tasksRouter.post('/:id/review', async (req, res) => {
  const { task, role } = await findTaskForUser(req.user!, idParam(req.params.id, 'Task'));
  res.json({ task: await reviewTask(task, role, req.user!.id, reviewTaskSchema.parse(req.body)) });
});

tasksRouter.post('/:id/images/:imageId/review', async (req, res) => {
  const { task, role } = await findTaskForUser(req.user!, idParam(req.params.id, 'Task'));
  const imageId = idParam(req.params.imageId, 'Image');
  const decided = await reviewImage(task, role, req.user!.id, imageId, reviewImageSchema.parse(req.body));
  res.json({ task: decided }); // null while other images still wait for a verdict
});

// ── Shapes on one image of the task ──

tasksRouter.get('/:id/images/:imageId/labels', async (req, res) => {
  const { task } = await findTaskForUser(req.user!, idParam(req.params.id, 'Task'));
  res.json({ labels: await listLabels(task.id, idParam(req.params.imageId, 'Image')) });
});

tasksRouter.post('/:id/images/:imageId/labels', async (req, res) => {
  const taskId = idParam(req.params.id, 'Task');
  const imageId = idParam(req.params.imageId, 'Image');
  res.status(201).json({ label: await createLabel(req.user!, taskId, imageId, createLabelSchema.parse(req.body)) });
});

tasksRouter.post('/:id/images/:imageId/labels/approve-all', async (req, res) => {
  const { task, role } = await findTaskForUser(req.user!, idParam(req.params.id, 'Task'));
  assertCanReview(task, role);
  const approved = await approvePendingLabels(task.id, req.user!.id, idParam(req.params.imageId, 'Image'));
  res.json({ approved });
});

// ── Segmentation helpers: they return a polygon, the editor then saves it as a new or changed shape ──

tasksRouter.post('/:id/images/:imageId/magic-wand', async (req, res) => {
  const taskId = idParam(req.params.id, 'Task');
  const imageId = idParam(req.params.imageId, 'Image');
  res.json({ geometry: await magicWand(req.user!, taskId, imageId, magicWandSchema.parse(req.body)) });
});

tasksRouter.post('/:id/images/:imageId/brush', async (req, res) => {
  const taskId = idParam(req.params.id, 'Task');
  const imageId = idParam(req.params.imageId, 'Image');
  res.json(await brushStroke(req.user!, taskId, imageId, brushSchema.parse(req.body)));
});

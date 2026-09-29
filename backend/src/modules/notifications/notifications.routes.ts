import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth';
import { idParam } from '../../lib/params';
import { listNotifications, markRead, markAllRead } from './notifications.service';

// The bell in the top bar: every user sees only their own notifications
export const notificationsRouter = Router();
notificationsRouter.use(requireAuth);

notificationsRouter.get('/', async (req, res) => {
  res.json(await listNotifications(req.user!.id));
});

notificationsRouter.post('/read-all', async (req, res) => {
  await markAllRead(req.user!.id);
  res.status(204).end();
});

notificationsRouter.post('/:id/read', async (req, res) => {
  await markRead(req.user!.id, idParam(req.params.id, 'Notification'));
  res.status(204).end();
});

import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth';
import { requireRole } from '../../middleware/require-role';
import { idParam } from '../../lib/params';
import { createUserSchema, updateUserSchema, groupSchema } from './users.schemas';
import { listUsers, createUser, updateUser, deleteUser } from './users.service';
import { listUserGroups, createUserGroup, renameUserGroup, deleteUserGroup } from './user-groups.service';

// Admin Settings → Users tab. Admins only.
export const usersRouter = Router();
usersRouter.use(requireAuth, requireRole('ADMIN'));

usersRouter.get('/', async (_req, res) => {
  res.json({ users: await listUsers() });
});

usersRouter.post('/', async (req, res) => {
  const user = await createUser(createUserSchema.parse(req.body));
  res.status(201).json({ user });
});

usersRouter.patch('/:id', async (req, res) => {
  const user = await updateUser(idParam(req.params.id, 'User'), updateUserSchema.parse(req.body), req.user!.id);
  res.json({ user });
});

usersRouter.delete('/:id', async (req, res) => {
  await deleteUser(idParam(req.params.id, 'User'), req.user!.id);
  res.status(204).end();
});

// Admin Settings → Users tab → "Groups"
export const userGroupsRouter = Router();
userGroupsRouter.use(requireAuth, requireRole('ADMIN'));

userGroupsRouter.get('/', async (_req, res) => {
  res.json({ groups: await listUserGroups() });
});

userGroupsRouter.post('/', async (req, res) => {
  const group = await createUserGroup(groupSchema.parse(req.body).name);
  res.status(201).json({ group });
});

userGroupsRouter.patch('/:id', async (req, res) => {
  const group = await renameUserGroup(idParam(req.params.id, 'Group'), groupSchema.parse(req.body).name);
  res.json({ group });
});

userGroupsRouter.delete('/:id', async (req, res) => {
  await deleteUserGroup(idParam(req.params.id, 'Group'));
  res.status(204).end();
});

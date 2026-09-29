import { Router } from 'express';
import { requireAuth } from '../../middleware/require-auth';
import { requireRole } from '../../middleware/require-role';
import { idParam } from '../../lib/params';
import { findProjectForUser } from '../../permissions/access';
import { createProjectSchema, updateProjectSchema, addMembersSchema, setLabelClassesSchema } from './projects.schemas';
import {
  listProjects,
  createProject,
  getProject,
  updateProject,
  deleteProject,
  listProjectLabelClasses,
  setProjectLabelClasses,
} from './projects.service';
import { listMembers, addMembers, removeMember } from './members.service';
import { getProjectStats } from './stats.service';
import { listProjectImages, addUploadedImages } from '../images/images.service';
import { uploadImages, uploadedFiles, removeTempFiles } from '../images/upload';
import { HttpError } from '../../lib/http-error';

export const projectsRouter = Router();
projectsRouter.use(requireAuth);

const admin = requireRole('ADMIN');

// Home page cards: admins see every project, others the projects they are members of
projectsRouter.get('/', async (req, res) => {
  res.json({ projects: await listProjects(req.user!) });
});

projectsRouter.post('/', admin, async (req, res) => {
  const project = await createProject(createProjectSchema.parse(req.body), req.user!.id);
  res.status(201).json({ project });
});

projectsRouter.get('/:id', async (req, res) => {
  res.json({ project: await getProject(req.user!, idParam(req.params.id, 'Project')) });
});

projectsRouter.patch('/:id', admin, async (req, res) => {
  const projectId = idParam(req.params.id, 'Project');
  await updateProject(projectId, updateProjectSchema.parse(req.body));
  res.json({ project: await getProject(req.user!, projectId) });
});

projectsRouter.delete('/:id', admin, async (req, res) => {
  await deleteProject(idParam(req.params.id, 'Project'));
  res.status(204).end();
});

// ── Team ──

projectsRouter.get('/:id/members', async (req, res) => {
  const project = await findProjectForUser(req.user!, idParam(req.params.id, 'Project'));
  res.json({ members: await listMembers(project.id) });
});

projectsRouter.post('/:id/members', admin, async (req, res) => {
  const project = await findProjectForUser(req.user!, idParam(req.params.id, 'Project'));
  const { userIds } = addMembersSchema.parse(req.body);
  res.status(201).json({ members: await addMembers(project.id, userIds) });
});

projectsRouter.delete('/:id/members/:userId', admin, async (req, res) => {
  const project = await findProjectForUser(req.user!, idParam(req.params.id, 'Project'));
  await removeMember(project.id, idParam(req.params.userId, 'User'));
  res.status(204).end();
});

// ── Label classes used by the project ──

projectsRouter.get('/:id/label-classes', async (req, res) => {
  const project = await findProjectForUser(req.user!, idParam(req.params.id, 'Project'));
  res.json({ labelClasses: await listProjectLabelClasses(project.id) });
});

projectsRouter.put('/:id/label-classes', admin, async (req, res) => {
  const project = await findProjectForUser(req.user!, idParam(req.params.id, 'Project'));
  const { labelClassIds } = setLabelClassesSchema.parse(req.body);
  res.json({ labelClasses: await setProjectLabelClasses(project.id, labelClassIds) });
});

// ── Imagery ──

projectsRouter.get('/:id/images', async (req, res) => {
  const project = await findProjectForUser(req.user!, idParam(req.params.id, 'Project'));
  res.json({ images: await listProjectImages(project.id) });
});

// multipart/form-data with one or more "files"
projectsRouter.post('/:id/images', admin, uploadImages, async (req, res) => {
  const files = uploadedFiles(req.files);
  try {
    const project = await findProjectForUser(req.user!, idParam(req.params.id, 'Project'));
    if (files.length === 0) throw new HttpError(400, 'Choose at least one image file');
    res.status(201).json({ images: await addUploadedImages(project.id, files, req.user!.id) });
  } finally {
    await removeTempFiles(files); // saved files were already moved away
  }
});

// ── Stats ──

projectsRouter.get('/:id/stats', async (req, res) => {
  const project = await findProjectForUser(req.user!, idParam(req.params.id, 'Project'));
  res.json({ stats: await getProjectStats(project.id) });
});

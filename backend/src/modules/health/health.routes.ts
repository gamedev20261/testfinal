import { Router } from 'express';
import { prisma } from '../../lib/prisma';

export const healthRouter = Router();

// GET /api/health: is the API running, and can it reach the database?
healthRouter.get('/', async (_req, res) => {
  const time = new Date().toISOString();
  try {
    await prisma.$queryRaw`SELECT 1`; // the smallest possible question to the database
    res.json({ status: 'ok', database: 'ok', time });
  } catch {
    res.status(503).json({ status: 'error', database: 'unreachable', time });
  }
});

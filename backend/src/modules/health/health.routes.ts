import { Router } from 'express';
import { pool } from '../../db/client';

export const healthRouter = Router();

// GET /api/health: is the API running, can it reach the database, is PostGIS installed?
healthRouter.get('/', async (_req, res) => {
  const time = new Date().toISOString();
  try {
    const { rows } = await pool.query(
      "SELECT extversion AS postgis FROM pg_extension WHERE extname = 'postgis'",
    );
    res.json({ status: 'ok', database: 'ok', postgis: rows[0]?.postgis ?? 'missing', time });
  } catch {
    res.status(503).json({ status: 'error', database: 'unreachable', time });
  }
});

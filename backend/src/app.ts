import express from 'express';
import helmet from 'helmet';
import { requestLogger } from './middleware/request-logger';
import { healthRouter } from './modules/health/health.routes';

// Builds the Express app. It does not start listening: server.ts does that.
export function createApp() {
  const app = express();

  // 1. Middleware: runs for every request, from top to bottom
  app.use(helmet()); // adds security-related HTTP headers
  app.use(requestLogger); // prints each request in the terminal
  app.use(express.json()); // turns a JSON request body into req.body

  // 2. Routes: each feature has its own router, mounted under a path
  app.use('/api/health', healthRouter);

  // 3. No route matched: answer with JSON instead of Express's HTML page
  app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
  });

  return app;
}

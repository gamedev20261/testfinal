import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { requestLogger } from './middleware/request-logger';
import { errorHandler } from './middleware/error-handler';
import { healthRouter } from './modules/health/health.routes';
import { authRouter } from './modules/auth/auth.routes';

// Builds the Express app. It does not start listening: server.ts does that.
export function createApp() {
  const app = express();

  // 1. Middleware: runs for every request, from top to bottom
  app.use(helmet()); // adds security-related HTTP headers
  app.use(requestLogger); // prints each request in the terminal
  app.use(express.json()); // turns a JSON request body into req.body
  app.use(cookieParser()); // turns the Cookie header into req.cookies

  // 2. Routes: each feature has its own router, mounted under a path
  app.use('/api/health', healthRouter);
  app.use('/api/auth', authRouter);

  // 3. No route matched: answer with JSON instead of Express's HTML page
  app.use((req, res) => {
    res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
  });

  // 4. Errors thrown anywhere above end up here
  app.use(errorHandler);

  return app;
}

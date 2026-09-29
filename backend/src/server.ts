import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { checkDatabaseConnection } from './lib/database-check';

// Entry point: `npm run dev` starts this file.
const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`API ready on http://localhost:${env.PORT}`);
  void checkDatabaseConnection(); // logs "Database connected" or what is wrong
});

import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';

// Entry point: `npm run dev` starts this file.
const app = createApp();

app.listen(env.PORT, () => {
  logger.info(`API ready on http://localhost:${env.PORT}`);
});

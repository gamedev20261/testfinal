import { createApp } from './app';
import { env } from './config/env';
import { logger } from './lib/logger';
import { checkDatabaseConnection } from './lib/database-check';
import { ensureUploadFolders } from './lib/storage';
import { requeueUnfinishedImages } from './modules/images/processing/image-jobs';

// Entry point: `npm run dev` starts this file.
const app = createApp();

await ensureUploadFolders();

app.listen(env.PORT, async () => {
  logger.info(`API ready on http://localhost:${env.PORT}`);
  const connected = await checkDatabaseConnection(); // logs "Database connected" or what is wrong
  if (connected) await requeueUnfinishedImages();
});

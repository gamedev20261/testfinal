import { and, inArray, isNull } from 'drizzle-orm';
import { db } from '../../../db/client';
import { images } from '../../../db/schema';
import { env } from '../../../config/env';
import { JobQueue } from '../../../lib/job-queue';
import { logger } from '../../../lib/logger';
import { processImage } from './process-image';

const queue = new JobQueue('Image', env.IMAGE_WORKERS, processImage);

export const queueImageProcessing = (imageId: string) => queue.add(imageId);

// After a restart: finish images that were waiting or half done
export async function requeueUnfinishedImages() {
  const unfinished = await db
    .select({ id: images.id })
    .from(images)
    .where(and(inArray(images.status, ['UPLOADED', 'PROCESSING']), isNull(images.deletedAt)));
  if (unfinished.length > 0) logger.info(`Processing ${unfinished.length} unfinished image(s)`);
  unfinished.forEach(({ id }) => queue.add(id));
}

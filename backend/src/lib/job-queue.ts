import { logger } from './logger';

// A tiny in-memory queue: runs `work(id)` for each id, `concurrency` at a time.
// The same id is never queued twice. Lost on restart, so callers re-queue on startup.
export class JobQueue {
  private waiting: string[] = [];
  private running = new Set<string>();

  constructor(
    private readonly name: string,
    private readonly concurrency: number,
    private readonly work: (id: string) => Promise<void>,
  ) {}

  add(id: string) {
    if (this.running.has(id) || this.waiting.includes(id)) return;
    this.waiting.push(id);
    this.next();
  }

  private next() {
    while (this.running.size < this.concurrency && this.waiting.length > 0) {
      const id = this.waiting.shift()!;
      this.running.add(id);
      this.work(id)
        .catch((err) => logger.error(err, `${this.name} job ${id} failed`))
        .finally(() => {
          this.running.delete(id);
          this.next();
        });
    }
  }
}

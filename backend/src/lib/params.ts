import { z } from 'zod';
import { HttpError } from './http-error';

const uuid = z.uuid();

// Reads an id from the URL (req.params.id). Anything that isn't a valid id → 404.
export function idParam(value: unknown, what = 'Item'): string {
  const result = uuid.safeParse(value);
  if (!result.success) throw new HttpError(404, `${what} not found`);
  return result.data;
}

import pino from 'pino';
import { env, isProduction } from '../config/env';

// One shared logger for the whole backend.
// In development, pino-pretty turns the JSON lines into coloured, readable text.
export const logger = pino({
  level: env.LOG_LEVEL,
  transport: isProduction
    ? undefined
    : {
        target: 'pino-pretty',
        options: { colorize: true, translateTime: 'HH:MM:ss', ignore: 'pid,hostname' },
      },
});

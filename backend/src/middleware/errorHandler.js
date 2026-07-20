import { env } from '../config/env.js';

export function errorHandler(error, _req, res, _next) {
  const statusCode = error.statusCode ?? 500;

  if (statusCode === 500) {
    console.error('[error]', error.message);
  }

  res.status(statusCode).json({
    message: statusCode === 500 && env.nodeEnv === 'production'
      ? 'Internal server error'
      : (error.message ?? 'Internal server error'),
  });
}

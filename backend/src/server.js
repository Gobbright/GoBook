import path from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env.js';
import { connectDatabase, getDatabaseStatus } from './services/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFoundHandler } from './middleware/notFoundHandler.js';
import { apiRouter } from './routes/index.js';
import { startScheduledJobs } from './jobs/scheduler.js';
import { ensureDefaultSubscriptionPlans } from './services/subscriptionPlans.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

process.on('uncaughtException', (err) => {
  console.error('[uncaughtException]', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason?.message ?? reason);
});

const app = express();

// Trust Hostinger's nginx reverse proxy.
app.set('trust proxy', 1);

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use((_req, res, next) => {
  res.setHeader('X-Robots-Tag', 'index, follow');
  res.setHeader('Publisher', 'GoBright-Anbu');
  next();
});

const configuredOrigins = new Set([env.clientUrl, ...env.allowedOrigins].filter(Boolean));
const localNetworkOrigin = /^http:\/\/((localhost|127\.0\.0\.1)|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+)(:\d+)?$/;
const productionOrigins = configuredOrigins;
const corsOrigin = env.nodeEnv === 'production'
  ? (origin, callback) => {
      if (!origin || productionOrigins.has(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked origin: ${origin}`));
    }
  : (origin, callback) => {
      if (!origin || configuredOrigins.has(origin) || localNetworkOrigin.test(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error(`CORS blocked origin: ${origin}`));
    };

app.use(cors({ origin: corsOrigin, credentials: true }));
app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buffer) => {
    if (req.originalUrl === '/api/subscriptions/razorpay/webhook') req.rawBody = Buffer.from(buffer);
  },
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan(env.nodeEnv === 'production' ? 'combined' : 'dev'));

app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'gobook-backend',
    environment: env.nodeEnv,
    database: getDatabaseStatus(),
  });
});

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));
app.use('/api', apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

const server = app.listen(env.port, () => {
  console.log(`GoBook API running on port ${env.port} [${env.nodeEnv}]`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${env.port} already in use.`);
  } else {
    console.error('Server error:', err.message);
  }
  process.exit(1);
});

async function connectDatabaseWithRetry() {
  try {
    await connectDatabase();
    await ensureDefaultSubscriptionPlans();
    console.log('Database connected - ready to serve requests');
    startScheduledJobs();
  } catch (error) {
    console.error('Failed to connect to database:', error.message);
    console.error('Keeping HTTP server alive and retrying MongoDB in 15 seconds.');
    setTimeout(connectDatabaseWithRetry, 15000);
  }
}

// Start HTTP first so Hostinger can reach /health while MongoDB DNS/network is warming up.
connectDatabaseWithRetry();

function shutdown() {
  server.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

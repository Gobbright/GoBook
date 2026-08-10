import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Always resolve .env relative to this file (Backend/src/config -> Backend/.env)
// so it loads correctly regardless of what directory Hostinger runs the process from.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function require(name) {
  const val = process.env[name];
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

function list(name) {
  return (process.env[name] ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

export const env = {
  nodeEnv:       process.env.NODE_ENV ?? 'development',
  port:          Number(process.env.PORT ?? 5000),

  clientUrl:     require('CLIENT_URL'),
  allowedOrigins: list('ALLOWED_ORIGINS'),
  mongodbUri:    require('MONGODB_URI'),
  mongodbDbName: process.env.MONGODB_DB_NAME ?? 'gobook',
  jwtSecret:     require('JWT_SECRET'),
  jwtExpiresIn:  process.env.JWT_EXPIRES_IN ?? '7d',
  adminLoginId: process.env.ADMIN_LOGIN_ID ?? 'admin',
  adminLoginPassword: process.env.ADMIN_LOGIN_PASSWORD ?? 'admin@123',
  adminJwtExpiresIn: process.env.ADMIN_JWT_EXPIRES_IN ?? '8h',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID ?? '',
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
  },

  groqApiKey:    process.env.GROQ_API_KEY ?? '',
  groqModel:     process.env.GROQ_MODEL ?? 'llama-3.3-70b-versatile',

  smtp: {
    host:   process.env.SMTP_HOST ?? '',
    port:   Number(process.env.SMTP_PORT ?? 587),
    secure: process.env.SMTP_SECURE === 'true',
    user:   process.env.SMTP_USER ?? '',
    pass:   process.env.SMTP_PASS ?? '',
    from:   process.env.SMTP_FROM ?? '',
  },
};

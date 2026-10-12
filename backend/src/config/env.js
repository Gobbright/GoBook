import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Always resolve .env relative to this file (backend/src/config -> backend/.env)
// so it loads correctly regardless of the process working directory.
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const adminAccounts = [
  { id: process.env.ADMIN_LOGIN_ID ?? 'admin', password: process.env.ADMIN_LOGIN_PASSWORD ?? 'admin@123' },
  { id: process.env.ADMIN_LOGIN_ID_2 ?? '', password: process.env.ADMIN_LOGIN_PASSWORD_2 ?? '' },
]
  .map((account) => ({ id: String(account.id || '').trim(), password: String(account.password || '') }))
  .filter((account) => account.id && account.password);
function requireAny(...names) {
  const val = names.map((name) => process.env[name]).find(Boolean);
  if (!val) throw new Error(`Missing required environment variable: ${names.join(' or ')}`);
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

  // Prefer deployment names, but keep existing local names as fallback.
  clientUrl:     requireAny('FRONTEND_URL', 'CLIENT_URL'),
  allowedOrigins: list('ALLOWED_ORIGINS'),
  mongodbUri:    requireAny('MONGO_URI', 'MONGODB_URI'),
  mongodbDbName: process.env.MONGODB_DB_NAME ?? 'gobook',
  dnsServers:    list('DNS_SERVERS'),
  jwtSecret:     requireAny('JWT_SECRET'),
  jwtExpiresIn:  process.env.JWT_EXPIRES_IN ?? '7d',
  adminAccounts,
  adminLoginId: adminAccounts[0]?.id ?? 'admin',
  adminLoginPassword: adminAccounts[0]?.password ?? '',
  adminJwtExpiresIn: process.env.ADMIN_JWT_EXPIRES_IN ?? '8h',
  googleClientId: process.env.GOOGLE_CLIENT_ID ?? '',

  meta: {
    appId: process.env.META_APP_ID ?? '',
    appSecret: process.env.META_APP_SECRET ?? '',
    configId: process.env.META_LOGIN_CONFIG_ID ?? '',
    graphVersion: process.env.META_GRAPH_API_VERSION ?? '',
    encryptionKey: process.env.META_TOKEN_ENCRYPTION_KEY ?? '',
    publicOrigin: process.env.META_PUBLIC_ORIGIN ?? 'https://www.gobooksuite.com',
  },

  // When false, registration skips Razorpay checkout and activates the account directly.
  paymentRequired: process.env.PAYMENT_REQUIRED !== 'false',
  onlineStoreEnabled: process.env.ONLINE_STORE_ENABLED === 'true',

  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID ?? '',
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? '',
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? '',
  },
    verificationAmountPaise: Number(process.env.RAZORPAY_VERIFICATION_AMOUNT_PAISE ?? 100),

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


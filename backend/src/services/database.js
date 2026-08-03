import mongoose from 'mongoose';

import { env } from '../config/env.js';
import { auditPlugin } from './auditPlugin.js';

// Registered before any model is compiled (this module is imported ahead of
// routes/index.js in server.js, which is what pulls in every controller and
// therefore every model) so it attaches to all of them automatically.
mongoose.plugin(auditPlugin);

const READY_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

let listenersRegistered = false;
let lastConnectionError = '';

async function dropLegacyIndexes() {
  const db = mongoose.connection.db;
  const drops = [
    { col: 'products',        index: 'code_1' },
    { col: 'employees',       index: 'employeeId_1' },
    { col: 'invoices',        index: 'number_1' },
    { col: 'stockins',        index: 'stockInNo_1' },
    { col: 'stockouts',       index: 'stockOutNo_1' },
    { col: 'bankbookentries', index: 'vchNo_1' },
    { col: 'cashbookentries', index: 'vchNo_1' },
    { col: 'journalentries',  index: 'entryNo_1' },
    { col: 'ledgeraccounts',  index: 'name_1' },
    { col: 'salesrecords',    index: 'number_1' },
    { col: 'leaves',          index: 'leaveId_1' },
    { col: 'branches',        index: 'code_1' },
    { col: 'attendances',     index: 'employeeId_1_date_1' },
    { col: 'payrolls',        index: 'employeeId_1_month_1' },
  ];
  for (const { col, index } of drops) {
    await db.collection(col).dropIndex(index).catch(() => {});
  }
}

function registerConnectionListeners() {
  if (listenersRegistered) return;
  listenersRegistered = true;

  mongoose.connection.on('connected', () => {
    lastConnectionError = '';
    console.log(`MongoDB connected - db: ${env.mongodbDbName}`);
  });

  mongoose.connection.on('error', (error) => {
    lastConnectionError = error.message;
    console.error('MongoDB connection error:', error.message);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected');
  });
}

export function getDatabaseStatus() {
  return {
    status: READY_STATES[mongoose.connection.readyState] ?? 'unknown',
    readyState: mongoose.connection.readyState,
    dbName: env.mongodbDbName,
    lastError: lastConnectionError || undefined,
  };
}

export async function connectDatabase() {
  registerConnectionListeners();

  await mongoose.connect(env.mongodbUri, {
    dbName: env.mongodbDbName,
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 60000,
    connectTimeoutMS: 30000,
    retryWrites: true,
    w: 'majority',
  });

  await dropLegacyIndexes();
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

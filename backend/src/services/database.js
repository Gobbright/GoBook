import mongoose from 'mongoose';

import { env } from '../config/env.js';

const READY_STATES = {
  0: 'disconnected',
  1: 'connected',
  2: 'connecting',
  3: 'disconnecting',
};

let listenersRegistered = false;
let lastConnectionError = '';
let connectionPromise = null;
let reconnectTimer = null;
let maintenanceComplete = false;

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

function scheduleReconnect() {
  if (reconnectTimer || mongoose.connection.readyState === 1 || mongoose.connection.readyState === 2) return;
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    try {
      await connectDatabase();
      console.log('MongoDB reconnected');
    } catch (error) {
      lastConnectionError = error.message;
      console.error('MongoDB reconnect failed:', error.message);
      scheduleReconnect();
    }
  }, 3000);
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
    scheduleReconnect();
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
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connectionPromise) return connectionPromise;

  connectionPromise = (async () => {
    await mongoose.connect(env.mongodbUri, {
      dbName: env.mongodbDbName,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 20000,
      connectTimeoutMS: 10000,
      heartbeatFrequencyMS: 5000,
      maxPoolSize: 20,
      minPoolSize: 2,
      retryWrites: true,
      w: 'majority',
    });

    if (!maintenanceComplete) {
      await dropLegacyIndexes();
      maintenanceComplete = true;
    }
    return mongoose.connection;
  })();

  try {
    return await connectionPromise;
  } finally {
    connectionPromise = null;
  }
}

export async function disconnectDatabase() {
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  await mongoose.disconnect();
}

import mongoose from 'mongoose';
import { env } from '../src/config/env.js';
import { MetaOAuthState, MetaConnection, MetaDeletionRequest, MetaSubjectGuard } from '../src/models/MetaIntegration.js';

try {
  await mongoose.connect(env.mongodbUri, { dbName: env.mongodbDbName });
  const hello = await mongoose.connection.db.admin().command({ hello: 1 });
  if (!hello.setName && hello.msg !== 'isdbgrid') throw new Error('Meta callbacks require MongoDB transactions: use Atlas or a replica set.');
  for (const Model of [MetaOAuthState, MetaConnection, MetaDeletionRequest, MetaSubjectGuard]) {
    await Model.createCollection();
    await Model.createIndexes();
    console.log('Ready: ' + Model.modelName);
  }
} catch {
  console.error('Meta database setup failed. Verify replica-set support, database permissions and connectivity.');
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }

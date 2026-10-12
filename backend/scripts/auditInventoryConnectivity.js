import 'dotenv/config';
import mongoose from 'mongoose';

import { Invoice } from '../src/models/Invoice.js';
import { StockIn } from '../src/models/StockIn.js';
import { StockOut } from '../src/models/StockOut.js';
import { postInventoryForDocument } from '../src/services/inventoryMovements.js';

const OUT_TYPES = new Set(['invoice', 'bill-of-supply', 'pharmacy-bill', 'supplier-return']);
const IN_TYPES = new Set(['purchase-entry', 'sales-return']);
const DOC_TYPES = [...OUT_TYPES, ...IN_TYPES];

function argValue(name) {
  const prefix = `--${name}=`;
  const arg = process.argv.find((value) => value.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : '';
}

function hasFlag(name) {
  return process.argv.includes(`--${name}`);
}

function hasStockItems(doc) {
  return (doc.items || []).some((item) => item.itemType !== 'Service' && Number(item.qty || 0) > 0);
}

function isOnlineStoreStockHandled(doc) {
  return doc.extra?.stockHandledByOnlineOrder === true || doc.extra?.source === 'online-store';
}

async function movementCount(doc) {
  const Model = OUT_TYPES.has(doc.documentType) ? StockOut : StockIn;
  return Model.countDocuments({
    userId: doc.userId,
    sourceType: doc.documentType,
    sourceId: doc._id,
  });
}

async function main() {
  const apply = hasFlag('apply');
  const userId = argValue('userId');
  const limit = Math.max(1, Number(argValue('limit') || 5000));

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI is not configured');
  }

  await mongoose.connect(process.env.MONGODB_URI);

  const filter = { documentType: { $in: DOC_TYPES } };
  if (userId) filter.userId = userId;

  const docs = await Invoice.find(filter).sort({ createdAt: 1 }).limit(limit).lean();
  const missing = [];
  const skipped = [];
  const repaired = [];
  const failed = [];

  for (const doc of docs) {
    if (!hasStockItems(doc)) {
      skipped.push({ number: doc.number, type: doc.documentType, reason: 'No stock product lines' });
      continue;
    }
    if (OUT_TYPES.has(doc.documentType) && isOnlineStoreStockHandled(doc)) {
      skipped.push({ number: doc.number, type: doc.documentType, reason: 'Online order stock handled separately' });
      continue;
    }

    const count = await movementCount(doc);
    if (count > 0) continue;

    const row = {
      id: String(doc._id),
      number: doc.number,
      type: doc.documentType,
      items: (doc.items || [])
        .filter((item) => item.itemType !== 'Service' && Number(item.qty || 0) > 0)
        .map((item) => ({
          description: item.description,
          qty: item.qty,
          productId: item.productId ? String(item.productId) : '',
          code: item.productCode || item.code || '',
          barcode: item.barcode || '',
        })),
    };
    missing.push(row);

    if (!apply) continue;
    try {
      const result = await postInventoryForDocument(doc, doc.userId);
      repaired.push({ number: doc.number, type: doc.documentType, result });
    } catch (error) {
      failed.push({ number: doc.number, type: doc.documentType, error: error.message });
    }
  }

  console.log(JSON.stringify({
    mode: apply ? 'apply' : 'dry-run',
    scanned: docs.length,
    missingCount: missing.length,
    repairedCount: repaired.length,
    failedCount: failed.length,
    missing,
    repaired,
    failed,
    skippedCount: skipped.length,
    skipped,
  }, null, 2));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect().catch(() => {});
  process.exit(1);
});

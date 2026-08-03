import { AuditLog } from '../models/AuditLog.js';
import { currentActor } from './auditContext.js';

// Best-effort human-readable label for an audit row — checked in priority
// order since different models use different "name" fields.
const LABEL_FIELDS = ['number', 'name', 'description', 'title', 'email', 'code', 'voucherNo'];

function resolveLabel(doc) {
  if (!doc) return '';
  for (const field of LABEL_FIELDS) {
    const value = doc[field];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return doc._id ? String(doc._id) : '';
}

// Fire-and-forget: never let audit logging fail or slow down the write it's
// describing. Not awaited by callers on purpose.
function logAudit(entry) {
  const actor = currentActor();
  AuditLog.create({
    businessId: actor?.businessId || undefined,
    performedBy: { userId: actor?.userId || undefined, email: actor?.email || '' },
    ...entry,
  }).catch((err) => {
    console.error(`[audit] failed to log ${entry.action} on ${entry.modelName}:`, err.message);
  });
}

// Registered once, globally, via mongoose.plugin() in services/database.js —
// applies to every model compiled afterward with zero per-model or
// per-controller changes. See backend/src/models/AuditLog.js for the
// excludeFromAudit guard that keeps this from auditing its own writes.
export function auditPlugin(schema) {
  if (schema.options?.excludeFromAudit) return;

  schema.pre('save', function preSave() {
    this.$locals.__auditWasNew = this.isNew;
  });

  schema.post('save', function postSave(doc) {
    if (!doc) return;
    logAudit({
      action: doc.$locals?.__auditWasNew ? 'create' : 'update',
      modelName: doc.constructor?.modelName,
      documentId: doc._id,
      documentLabel: resolveLabel(doc),
    });
  });

  schema.post(['findOneAndUpdate', 'findOneAndReplace'], function postFindOneAndUpdate(doc) {
    if (!doc) return;
    const upsert = Boolean(this.getOptions?.().upsert);
    const isCreate = upsert && doc.createdAt && doc.updatedAt
      && new Date(doc.createdAt).getTime() === new Date(doc.updatedAt).getTime();
    logAudit({
      action: isCreate ? 'create' : 'update',
      modelName: this.model.modelName,
      documentId: doc._id,
      documentLabel: resolveLabel(doc),
    });
  });

  schema.post('findOneAndDelete', function postFindOneAndDelete(doc) {
    if (!doc) return;
    logAudit({
      action: 'delete',
      modelName: this.model.modelName,
      documentId: doc._id,
      documentLabel: resolveLabel(doc),
    });
  });

  // Bulk query-style writes only give a result count, not the affected
  // documents — log one summarizing entry per call rather than fetching and
  // logging every match individually.
  schema.post(['updateOne', 'updateMany'], function postUpdateMany(result) {
    const matched = result?.matchedCount ?? result?.n ?? 0;
    if (!matched) return;
    logAudit({
      action: 'update',
      modelName: this.model.modelName,
      documentLabel: `${matched} document(s) matched`,
      meta: { filter: this.getFilter?.() },
    });
  });

  schema.post(['deleteOne', 'deleteMany'], function postDeleteMany(result) {
    const deleted = result?.deletedCount ?? 0;
    if (!deleted) return;
    logAudit({
      action: 'delete',
      modelName: this.model.modelName,
      documentLabel: `${deleted} document(s) deleted`,
      meta: { filter: this.getFilter?.() },
    });
  });
}

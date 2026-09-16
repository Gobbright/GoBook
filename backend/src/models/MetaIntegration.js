import { Schema, model } from 'mongoose';

const options = { timestamps: true, excludeFromAudit: true };
const stateSchema = new Schema({
  stateHash: { type: String, required: true, unique: true },
  browserHash: { type: String, required: true },
  userId: { type: Schema.Types.ObjectId, required: true },
  businessId: { type: Schema.Types.ObjectId, required: true, index: true },
  mode: { type: String, enum: ['redirect', 'embedded'], required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}, options);

const connectionSchema = new Schema({
  businessId: { type: Schema.Types.ObjectId, required: true, unique: true },
  ownerUserId: { type: Schema.Types.ObjectId, required: true },
  metaUserId: { type: String, required: true, index: true, select: false },
  tokenEncrypted: { type: String, select: false },
  tokenExpiresAt: Date,
  dataAccessExpiresAt: Date,
  scopes: [String],
  status: { type: String, enum: ['connected', 'disconnected'], required: true },
  wabaId: String,
  wabaName: String,
  phoneNumberId: String,
  displayPhoneNumber: String,
  verifiedName: String,
  phoneStatus: String,
  connectedAt: Date,
  disconnectedAt: Date,
}, options);
// A connected phone cannot be claimed by a different GoBook tenant.
connectionSchema.index({ phoneNumberId: 1 }, { unique: true, partialFilterExpression: { status: 'connected' } });

const deletionSchema = new Schema({
  confirmationCode: { type: String, unique: true, required: true },
  requestHash: { type: String, unique: true, required: true, select: false },
  status: { type: String, enum: ['completed'], default: 'completed' },
  completedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true, expires: 0 },
}, options);

// Serialize callbacks against connection commits. Stores only a keyed pseudonym,
// preventing an older in-flight authorization from recreating deleted data.
const subjectSchema = new Schema({
  _id: String,
  revokedBefore: { type: Date, default: () => new Date(0) },
  revision: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true, expires: 0 },
}, options);

export const MetaOAuthState = model('MetaOAuthState', stateSchema);
export const MetaConnection = model('MetaConnection', connectionSchema);
export const MetaDeletionRequest = model('MetaDeletionRequest', deletionSchema);
export const MetaSubjectGuard = model('MetaSubjectGuard', subjectSchema);

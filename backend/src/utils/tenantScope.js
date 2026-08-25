import { Types } from 'mongoose';

import { AppUser } from '../models/AppUser.js';

export function isBusinessSuperAdmin(user = {}) {
  return user.isSuperAdmin === true || user.accountType === 'owner' || user.role === 'Super Admin';
}

function castForPath(model, field, value) {
  const schemaType = model.schema.path(field);
  return schemaType?.instance === 'ObjectId' && Types.ObjectId.isValid(value)
    ? new Types.ObjectId(value)
    : value;
}

export async function scopedOwnerValues(req, ownerField) {
  if (ownerField === 'businessId') return req.user.businessId ? [req.user.businessId] : [];
  if (!isBusinessSuperAdmin(req.user) || !req.user.businessId) return [req.user.id];
  const users = await AppUser.find({ businessId: req.user.businessId }).select('_id').lean();
  return users.map((user) => user._id);
}

export async function scopedOwnerQuery(req, collection) {
  const values = await scopedOwnerValues(req, collection.ownerField);
  if (values.length === 0) return { [collection.ownerField]: null };
  if (values.length === 1) return { [collection.ownerField]: values[0] };
  return { [collection.ownerField]: { $in: values } };
}

export async function scopedOwnerAggregateMatch(req, collection) {
  const values = await scopedOwnerValues(req, collection.ownerField);
  const casted = values.map((value) => castForPath(collection.model, collection.ownerField, value));
  if (casted.length === 0) return { [collection.ownerField]: null };
  if (casted.length === 1) return { [collection.ownerField]: casted[0] };
  return { [collection.ownerField]: { $in: casted } };
}


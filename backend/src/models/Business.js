import { Schema, model } from 'mongoose';

import { CATEGORIES } from '../constants/categories.js';

const businessSchema = new Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, enum: CATEGORIES, default: 'retail' },
}, { timestamps: true });

export const Business = model('Business', businessSchema);

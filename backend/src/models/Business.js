import { Schema, model } from 'mongoose';

import { CATEGORIES, RETAIL_SUBCATEGORIES } from '../constants/categories.js';

const businessSchema = new Schema({
  name: { type: String, required: true, trim: true },
  category: { type: String, enum: CATEGORIES, default: 'retail' },
  retailSubcategory: { type: String, enum: ['', ...RETAIL_SUBCATEGORIES], default: '' },
}, { timestamps: true });

export const Business = model('Business', businessSchema);

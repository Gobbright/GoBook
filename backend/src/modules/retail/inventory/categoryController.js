import { Product } from '../../../models/Product.js';
import { ProductCategory } from '../../../models/ProductCategory.js';
import { httpError } from '../../../utils/httpError.js';

// GET /api/inventory/categories/stats
export async function getCategoryStats(req, res, next) {
  try {
    const userId = req.user.id;
    const [total, active, totalProducts] = await Promise.all([
      ProductCategory.countDocuments({ userId }),
      ProductCategory.countDocuments({ userId, status: 'Active' }),
      Product.countDocuments({ userId, category: { $nin: ['', null] } }),
    ]);
    res.json({ total, active, totalProducts });
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/categories?search=&page=&limit=
export async function listCategories(req, res, next) {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const filter = { userId: req.user.id };
    if (search) filter.name = new RegExp(search, 'i');

    const skip = (Number(page) - 1) * Number(limit);
    const [categories, total] = await Promise.all([
      ProductCategory.find(filter).sort({ name: 1 }).skip(skip).limit(Number(limit)).lean(),
      ProductCategory.countDocuments(filter),
    ]);

    const withCounts = await Promise.all(categories.map(async (cat) => ({
      ...cat,
      productCount: await Product.countDocuments({ userId: req.user.id, category: cat.name }),
    })));

    res.json({ data: withCounts, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/categories/:id
export async function getCategory(req, res, next) {
  try {
    const cat = await ProductCategory.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!cat) return next(httpError(404, 'Category not found'));
    res.json(cat);
  } catch (err) {
    next(err);
  }
}

// POST /api/inventory/categories
export async function createCategory(req, res, next) {
  try {
    const cat = await ProductCategory.create({ ...req.body, userId: req.user.id });
    res.status(201).json(cat);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, `Category "${req.body.name}" already exists`));
    next(err);
  }
}

// PUT /api/inventory/categories/:id
export async function updateCategory(req, res, next) {
  try {
    const existing = await ProductCategory.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!existing) return next(httpError(404, 'Category not found'));

    const cat = await ProductCategory.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: req.body },
      { new: true, runValidators: true },
    ).lean();

    // Keep tagged products in sync when a category is renamed, so the link doesn't silently break.
    if (req.body.name && req.body.name !== existing.name) {
      await Product.updateMany({ userId: req.user.id, category: existing.name }, { $set: { category: req.body.name } });
    }

    res.json(cat);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, `Category "${req.body.name}" already exists`));
    next(err);
  }
}

// DELETE /api/inventory/categories/:id
export async function deleteCategory(req, res, next) {
  try {
    const cat = await ProductCategory.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).lean();
    if (!cat) return next(httpError(404, 'Category not found'));
    res.json({ message: 'Category deleted' });
  } catch (err) {
    next(err);
  }
}

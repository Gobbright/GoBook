import { Product } from '../../../models/Product.js';
import { ProductCategory } from '../../../models/ProductCategory.js';
import { ProductSubcategory } from '../../../models/ProductSubcategory.js';
import { httpError } from '../../../utils/httpError.js';

function normalizeSubcategoryBody(body = {}) {
  const payload = { ...body };
  if ('name' in payload) payload.name = String(payload.name || '').trim();
  if ('description' in payload) payload.description = String(payload.description || '').trim();
  if ('categoryName' in payload) payload.categoryName = String(payload.categoryName || '').trim();
  if ('categoryId' in payload) payload.categoryId = payload.categoryId || null;
  if ('status' in payload) payload.status = payload.status === 'Inactive' ? 'Inactive' : 'Active';
  return payload;
}

let syncCache = new Set();
async function syncExistingCategorySubcategories(userId) {
  const key = String(userId);
  if (syncCache.has(key)) return;
  syncCache.add(key);

  try {
    const categories = await ProductCategory.find({ userId }).lean();
    for (const cat of categories) {
      if (Array.isArray(cat.subCategories) && cat.subCategories.length > 0) {
        for (const subName of cat.subCategories) {
          const trimmed = String(subName || '').trim();
          if (!trimmed) continue;
          const exists = await ProductSubcategory.findOne({ userId, name: trimmed }).lean();
          if (!exists) {
            await ProductSubcategory.create({
              userId,
              categoryId: cat._id,
              categoryName: cat.name,
              name: trimmed,
              status: 'Active',
            }).catch(() => {});
          }
        }
      }
    }
  } catch {
    // Ignore sync errors gracefully
  }
}

// GET /api/inventory/subcategories/stats
export async function getSubcategoryStats(req, res, next) {
  try {
    const userId = req.user.id;
    await syncExistingCategorySubcategories(userId);

    const [total, active, totalProducts] = await Promise.all([
      ProductSubcategory.countDocuments({ userId }),
      ProductSubcategory.countDocuments({ userId, status: 'Active' }),
      Product.countDocuments({ userId, subCategory: { $nin: ['', null] } }),
    ]);
    res.json({ total, active, totalProducts });
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/subcategories?search=&category=&page=&limit=
export async function listSubcategories(req, res, next) {
  try {
    const userId = req.user.id;
    await syncExistingCategorySubcategories(userId);

    const { search, category, categoryId, page = 1, limit = 50 } = req.query;
    const filter = { userId };

    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { categoryName: new RegExp(search, 'i') },
      ];
    }
    if (categoryId) filter.categoryId = categoryId;
    if (category) filter.categoryName = category;

    const skip = (Number(page) - 1) * Number(limit);
    const [subcategories, total] = await Promise.all([
      ProductSubcategory.find(filter).sort({ categoryName: 1, name: 1 }).skip(skip).limit(Number(limit)).lean(),
      ProductSubcategory.countDocuments(filter),
    ]);

    const withCounts = await Promise.all(subcategories.map(async (sub) => ({
      ...sub,
      productCount: await Product.countDocuments({ userId, subCategory: sub.name }),
    })));

    res.json({ data: withCounts, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/subcategories/:id
export async function getSubcategory(req, res, next) {
  try {
    const sub = await ProductSubcategory.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!sub) return next(httpError(404, 'Subcategory not found'));
    res.json(sub);
  } catch (err) {
    next(err);
  }
}

// POST /api/inventory/subcategories
export async function createSubcategory(req, res, next) {
  try {
    const userId = req.user.id;
    const payload = normalizeSubcategoryBody(req.body);

    if (!payload.name) return next(httpError(400, 'Subcategory name is required'));

    // Resolve category if possible
    let cat = null;
    if (payload.categoryId) {
      cat = await ProductCategory.findOne({ _id: payload.categoryId, userId }).lean();
      if (cat) payload.categoryName = cat.name;
    } else if (payload.categoryName) {
      cat = await ProductCategory.findOne({ name: payload.categoryName, userId }).lean();
      if (cat) payload.categoryId = cat._id;
    }

    const sub = await ProductSubcategory.create({ ...payload, userId });

    // Sync into parent category's subCategories list if category exists
    if (cat) {
      await ProductCategory.updateOne(
        { _id: cat._id, userId },
        { $addToSet: { subCategories: payload.name } }
      );
    }

    res.status(201).json(sub);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, `Subcategory "${req.body.name}" already exists`));
    next(err);
  }
}

// PUT /api/inventory/subcategories/:id
export async function updateSubcategory(req, res, next) {
  try {
    const userId = req.user.id;
    const existing = await ProductSubcategory.findOne({ _id: req.params.id, userId }).lean();
    if (!existing) return next(httpError(404, 'Subcategory not found'));

    const payload = normalizeSubcategoryBody(req.body);

    // Resolve category
    let cat = null;
    if (payload.categoryId) {
      cat = await ProductCategory.findOne({ _id: payload.categoryId, userId }).lean();
      if (cat) payload.categoryName = cat.name;
    } else if (payload.categoryName) {
      cat = await ProductCategory.findOne({ name: payload.categoryName, userId }).lean();
      if (cat) payload.categoryId = cat._id;
    }

    const sub = await ProductSubcategory.findOneAndUpdate(
      { _id: req.params.id, userId },
      { $set: payload },
      { new: true, runValidators: true }
    ).lean();

    const nameChanged = payload.name && payload.name !== existing.name;
    const categoryChanged = payload.categoryName !== existing.categoryName;

    // Keep tagged products in sync if renamed
    if (nameChanged) {
      await Product.updateMany({ userId, subCategory: existing.name }, { $set: { subCategory: payload.name } });
    }

    // Sync parent categories subCategories arrays
    if (categoryChanged || nameChanged) {
      // Remove old name from old parent category
      if (existing.categoryName) {
        await ProductCategory.updateOne(
          { userId, name: existing.categoryName },
          { $pull: { subCategories: existing.name } }
        );
      }
      // Add new name to new parent category
      if (payload.categoryName) {
        await ProductCategory.updateOne(
          { userId, name: payload.categoryName },
          { $addToSet: { subCategories: payload.name } }
        );
      }
    }

    res.json(sub);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, `Subcategory "${req.body.name}" already exists`));
    next(err);
  }
}

// DELETE /api/inventory/subcategories/:id
export async function deleteSubcategory(req, res, next) {
  try {
    const userId = req.user.id;
    const sub = await ProductSubcategory.findOneAndDelete({ _id: req.params.id, userId }).lean();
    if (!sub) return next(httpError(404, 'Subcategory not found'));

    // Pull from parent category if any
    if (sub.categoryName) {
      await ProductCategory.updateOne(
        { userId, name: sub.categoryName },
        { $pull: { subCategories: sub.name } }
      );
    }

    res.json({ message: 'Subcategory deleted' });
  } catch (err) {
    next(err);
  }
}

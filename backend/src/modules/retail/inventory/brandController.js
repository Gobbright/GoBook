import { Product } from '../../../models/Product.js';
import { ProductBrand } from '../../../models/ProductBrand.js';
import { httpError } from '../../../utils/httpError.js';

// GET /api/inventory/brands/stats
export async function getBrandStats(req, res, next) {
  try {
    const userId = req.user.id;
    const [total, active, totalProducts] = await Promise.all([
      ProductBrand.countDocuments({ userId }),
      ProductBrand.countDocuments({ userId, status: 'Active' }),
      Product.countDocuments({ userId, brand: { $nin: ['', null] } }),
    ]);
    res.json({ total, active, totalProducts });
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/brands?search=&page=&limit=
export async function listBrands(req, res, next) {
  try {
    const { search, page = 1, limit = 50 } = req.query;
    const filter = { userId: req.user.id };
    if (search) filter.name = new RegExp(search, 'i');

    const skip = (Number(page) - 1) * Number(limit);
    const [brands, total] = await Promise.all([
      ProductBrand.find(filter).sort({ name: 1 }).skip(skip).limit(Number(limit)).lean(),
      ProductBrand.countDocuments(filter),
    ]);

    const withCounts = await Promise.all(brands.map(async (brand) => ({
      ...brand,
      productCount: await Product.countDocuments({ userId: req.user.id, brand: brand.name }),
    })));

    res.json({ data: withCounts, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

// GET /api/inventory/brands/:id
export async function getBrand(req, res, next) {
  try {
    const brand = await ProductBrand.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!brand) return next(httpError(404, 'Brand not found'));
    res.json(brand);
  } catch (err) {
    next(err);
  }
}

// POST /api/inventory/brands
export async function createBrand(req, res, next) {
  try {
    const brand = await ProductBrand.create({ ...req.body, userId: req.user.id });
    res.status(201).json(brand);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, `Brand "${req.body.name}" already exists`));
    next(err);
  }
}

// PUT /api/inventory/brands/:id
export async function updateBrand(req, res, next) {
  try {
    const existing = await ProductBrand.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!existing) return next(httpError(404, 'Brand not found'));

    const brand = await ProductBrand.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: req.body },
      { new: true, runValidators: true },
    ).lean();

    // Keep tagged products in sync when a brand is renamed, so the link doesn't silently break.
    if (req.body.name && req.body.name !== existing.name) {
      await Product.updateMany({ userId: req.user.id, brand: existing.name }, { $set: { brand: req.body.name } });
    }

    res.json(brand);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, `Brand "${req.body.name}" already exists`));
    next(err);
  }
}

// DELETE /api/inventory/brands/:id
export async function deleteBrand(req, res, next) {
  try {
    const brand = await ProductBrand.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).lean();
    if (!brand) return next(httpError(404, 'Brand not found'));
    res.json({ message: 'Brand deleted' });
  } catch (err) {
    next(err);
  }
}

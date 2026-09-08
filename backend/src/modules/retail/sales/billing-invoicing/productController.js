import { Product } from '../../../../models/Product.js';
import { httpError } from '../../../../utils/httpError.js';
import { branchForNewRecord, branchScopedQuery } from '../../../../utils/branchScope.js';

// GET /api/sales/products?search=
export async function listProducts(req, res, next) {
  try {
    const { search, itemType } = req.query;
    const filter = await branchScopedQuery(req, { model: Product, ownerField: 'userId' });
    if (itemType === 'Product') {
      filter.$or = [
        { itemType: { $exists: false } },
        { itemType: { $ne: 'Service' } },
      ];
    } else if (itemType === 'Service') {
      filter.itemType = 'Service';
    }
    if (search) {
      const searchFilter = [
        { description: new RegExp(search, 'i') },
        { code: new RegExp(search, 'i') },
        { barcode: new RegExp(search, 'i') },
        { hsn: new RegExp(search, 'i') },
        { brand: new RegExp(search, 'i') },
        { category: new RegExp(search, 'i') },
        { modelNumber: new RegExp(search, 'i') },
        { serialNumber: new RegExp(search, 'i') },
        { warrantyPeriod: new RegExp(search, 'i') },
        { serviceType: new RegExp(search, 'i') },
        { technician: new RegExp(search, 'i') },
        { 'variants.size': new RegExp(search, 'i') },
        { 'variants.modelName': new RegExp(search, 'i') },
        { 'variants.modelCode': new RegExp(search, 'i') },
        { 'variants.colour': new RegExp(search, 'i') },
        { 'variants.color': new RegExp(search, 'i') },
        { 'variants.type': new RegExp(search, 'i') },
        { 'variants.material': new RegExp(search, 'i') },
        { 'variants.pattern': new RegExp(search, 'i') },
        { 'variants.quality': new RegExp(search, 'i') },
        { 'variants.ageGroup': new RegExp(search, 'i') },
        { 'variants.other': new RegExp(search, 'i') },
        { 'variants.barcode': new RegExp(search, 'i') },
      ];
      if (filter.$or) {
        const itemTypeFilter = filter.$or;
        delete filter.$or;
        filter.$and = [{ $or: itemTypeFilter }, { $or: searchFilter }];
      } else {
        filter.$or = searchFilter;
      }
    }
    const products = await Product.find(filter).sort({ createdAt: -1, _id: -1 }).limit(200).lean();
    res.json(products);
  } catch (err) {
    next(err);
  }
}

// GET /api/sales/products/:id
export async function getProduct(req, res, next) {
  try {
    const product = await Product.findOne(await branchScopedQuery(req, { model: Product, ownerField: 'userId' }, { _id: req.params.id })).lean();
    if (!product) return next(httpError(404, 'Product not found'));
    res.json(product);
  } catch (err) {
    next(err);
  }
}

// POST /api/sales/products
export async function createProduct(req, res, next) {
  try {
    const product = await Product.create({ ...req.body, userId: req.user.id, branch: await branchForNewRecord(req, req.body.branch) });
    res.status(201).json(product);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, `Product code "${req.body.code}" already exists`));
    next(err);
  }
}

// PUT /api/sales/products/:id
export async function updateProduct(req, res, next) {
  try {
    const product = await Product.findOneAndUpdate(
      await branchScopedQuery(req, { model: Product, ownerField: 'userId' }, { _id: req.params.id }),
      { $set: { ...req.body, branch: await branchForNewRecord(req, req.body.branch) } },
      { new: true, runValidators: true },
    ).lean();
    if (!product) return next(httpError(404, 'Product not found'));
    res.json(product);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/sales/products/:id
export async function deleteProduct(req, res, next) {
  try {
    const product = await Product.findOneAndDelete(await branchScopedQuery(req, { model: Product, ownerField: 'userId' }, { _id: req.params.id })).lean();
    if (!product) return next(httpError(404, 'Product not found'));
    res.json({ message: 'Product deleted' });
  } catch (err) {
    next(err);
  }
}

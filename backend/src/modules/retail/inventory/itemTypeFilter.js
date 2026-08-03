function escapeRegex(str) {
  return String(str ?? '').trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function itemTypeCond(itemType) {
  return itemType === 'Service' ? 'Service' : { $ne: 'Service' }; // default = Product
}

// Resolves the Product _ids + description-match regexes for a given itemType, for
// collections (StockIn/StockOut) that only loosely reference Product via
// productId/productName rather than a hard foreign key.
export async function resolveProductRefs(Product, userId, itemType) {
  const products = await Product.find({ userId, itemType: itemTypeCond(itemType) }, { _id: 1, description: 1 }).lean();
  const ids = products.map((p) => p._id);
  const nameRegexes = products.map((p) => new RegExp(`^${escapeRegex(p.description)}$`, 'i'));
  return { ids, nameRegexes };
}

export function productRefCondition({ ids, nameRegexes }) {
  return { $or: [{ productId: { $in: ids } }, { productName: { $in: nameRegexes } }] };
}

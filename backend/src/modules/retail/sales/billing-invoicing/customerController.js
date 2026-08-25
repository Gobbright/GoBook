import { Customer } from '../../../../models/Customer.js';
import { httpError } from '../../../../utils/httpError.js';
import { branchForNewRecord, branchScopedQuery } from '../../../../utils/branchScope.js';

// GET /api/sales/customers?search=
export async function listCustomers(req, res, next) {
  try {
    const { search } = req.query;
    const filter = await branchScopedQuery(req, { model: Customer, ownerField: 'userId' });
    if (search) {
      filter.$or = [{ name: new RegExp(search, 'i') }, { gstin: new RegExp(search, 'i') }, { phone: new RegExp(search, 'i') }];
    }
    const customers = await Customer.find(filter).sort({ name: 1 }).limit(100).lean();
    res.json(customers);
  } catch (err) {
    next(err);
  }
}

// GET /api/sales/customers/:id
export async function getCustomer(req, res, next) {
  try {
    const customer = await Customer.findOne(await branchScopedQuery(req, { model: Customer, ownerField: 'userId' }, { _id: req.params.id })).lean();
    if (!customer) return next(httpError(404, 'Customer not found'));
    res.json(customer);
  } catch (err) {
    next(err);
  }
}

// POST /api/sales/customers
export async function createCustomer(req, res, next) {
  try {
    const customer = await Customer.create({ ...req.body, userId: req.user.id, branch: await branchForNewRecord(req, req.body.branch) });
    res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
}

// PUT /api/sales/customers/:id
export async function updateCustomer(req, res, next) {
  try {
    const customer = await Customer.findOneAndUpdate(
      await branchScopedQuery(req, { model: Customer, ownerField: 'userId' }, { _id: req.params.id }),
      { $set: { ...req.body, branch: await branchForNewRecord(req, req.body.branch) } },
      { new: true, runValidators: true },
    ).lean();
    if (!customer) return next(httpError(404, 'Customer not found'));
    res.json(customer);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/sales/customers/:id
export async function deleteCustomer(req, res, next) {
  try {
    const customer = await Customer.findOneAndDelete(await branchScopedQuery(req, { model: Customer, ownerField: 'userId' }, { _id: req.params.id })).lean();
    if (!customer) return next(httpError(404, 'Customer not found'));
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    next(err);
  }
}

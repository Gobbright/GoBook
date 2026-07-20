import { Customer } from '../../../../models/Customer.js';
import { httpError } from '../../../../utils/httpError.js';

// GET /api/sales/customers?search=
export async function listCustomers(req, res, next) {
  try {
    const { search } = req.query;
    const filter = { userId: req.user.id };
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
    const customer = await Customer.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!customer) return next(httpError(404, 'Customer not found'));
    res.json(customer);
  } catch (err) {
    next(err);
  }
}

// POST /api/sales/customers
export async function createCustomer(req, res, next) {
  try {
    const customer = await Customer.create({ ...req.body, userId: req.user.id });
    res.status(201).json(customer);
  } catch (err) {
    next(err);
  }
}

// PUT /api/sales/customers/:id
export async function updateCustomer(req, res, next) {
  try {
    const customer = await Customer.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: req.body },
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
    const customer = await Customer.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).lean();
    if (!customer) return next(httpError(404, 'Customer not found'));
    res.json({ message: 'Customer deleted' });
  } catch (err) {
    next(err);
  }
}

import { AccountingVoucher } from '../../../models/AccountingVoucher.js';
import {
  createAccountingVoucher,
  deleteAccountingVoucher,
  getNextVoucherNo,
  updateAccountingVoucher,
  VOUCHER_TYPES,
} from '../../../services/accountingVouchers.js';
import { branchScopedQuery } from '../../../utils/branchScope.js';
import { httpError } from '../../../utils/httpError.js';

export function listVoucherTypes(_req, res) {
  res.json({ types: VOUCHER_TYPES });
}

export async function getNextVoucherNumber(req, res, next) {
  try {
    const { voucherType = 'Journal', date } = req.query;
    const voucherNo = await getNextVoucherNo(req.user.id, voucherType, date);
    res.json({ voucherNo });
  } catch (err) {
    next(err);
  }
}

export async function listVouchers(req, res, next) {
  try {
    const {
      voucherType,
      status,
      from,
      to,
      search,
      page = 1,
      limit = 50,
    } = req.query;
    const filter = await branchScopedQuery(req, { model: AccountingVoucher, ownerField: 'userId' });
    if (voucherType && voucherType !== 'All') filter.voucherType = voucherType;
    if (status && status !== 'All') filter.status = status;
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }
    if (search) {
      filter.$or = [
        { voucherNo: new RegExp(search, 'i') },
        { partyName: new RegExp(search, 'i') },
        { referenceNo: new RegExp(search, 'i') },
        { narration: new RegExp(search, 'i') },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [vouchers, total] = await Promise.all([
      AccountingVoucher.find(filter)
        .sort({ date: -1, createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      AccountingVoucher.countDocuments(filter),
    ]);

    res.json({ vouchers, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

export async function getVoucher(req, res, next) {
  try {
    const voucher = await AccountingVoucher.findOne(
      await branchScopedQuery(req, { model: AccountingVoucher, ownerField: 'userId' }, { _id: req.params.id }),
    ).lean();
    if (!voucher) return next(httpError(404, 'Voucher not found'));
    res.json({ voucher });
  } catch (err) {
    next(err);
  }
}

export async function createVoucher(req, res, next) {
  try {
    const voucher = await createAccountingVoucher(req.body ?? {}, req.user);
    res.status(201).json({ voucher });
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, 'Voucher number already exists'));
    next(err);
  }
}

export async function updateVoucher(req, res, next) {
  try {
    const voucher = await updateAccountingVoucher(req.params.id, req.body ?? {}, req.user);
    res.json({ voucher });
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, 'Voucher number already exists'));
    next(err);
  }
}

export async function deleteVoucher(req, res, next) {
  try {
    await deleteAccountingVoucher(req.params.id, req.user);
    res.json({ message: 'Voucher deleted' });
  } catch (err) {
    next(err);
  }
}

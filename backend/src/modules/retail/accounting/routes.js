import { Router } from 'express';

import {
  createBankBookEntry,
  createCashBookEntry,
  createJournalEntry,
  createLedgerAccount,
  deleteBankBookEntry,
  deleteCashBookEntry,
  deleteJournalEntry,
  deleteLedgerAccount,
  getAccountingSummary,
  getBalanceSheet,
  getBillWiseStatement,
  getCostCenterStatement,
  getDayBook,
  getBankReconciliation,
  getLedgerStatement,
  getOutstandingStatement,
  getPnlStatement,
  getTrialBalance,
  getVoucherRegister,
  importJournalEntries,
  importLedgerAccounts,
  listBankBookEntries,
  listCashBookEntries,
  listJournalEntries,
  listLedgerAccounts,
  resetAccountingFromInvoices,
  updateBankBookEntry,
  updateBankReconciliation,
  updateCashBookEntry,
  updateJournalEntry,
  updateLedgerAccount,
} from './accountingController.js';
import {
  createVoucher,
  deleteVoucher,
  getNextVoucherNumber,
  getVoucher,
  listVoucherTypes,
  listVouchers,
  updateVoucher,
} from './voucherController.js';
import { uploadExcelFile } from '../../../utils/excelImport.js';

export const accountingRouter = Router();

accountingRouter.get('/', getAccountingSummary);
accountingRouter.post('/reset-from-invoices', resetAccountingFromInvoices);

accountingRouter.get('/vouchers/types', listVoucherTypes);
accountingRouter.get('/vouchers/next-number', getNextVoucherNumber);
accountingRouter.get('/reports/day-book', getDayBook);
accountingRouter.get('/reports/ledger-statement', getLedgerStatement);
accountingRouter.get('/reports/voucher-register', getVoucherRegister);
accountingRouter.get('/reports/outstanding', getOutstandingStatement);
accountingRouter.get('/reports/bill-wise', getBillWiseStatement);
accountingRouter.get('/reports/cost-centers', getCostCenterStatement);
accountingRouter.get('/vouchers', listVouchers);
accountingRouter.post('/vouchers', createVoucher);
accountingRouter.get('/vouchers/:id', getVoucher);
accountingRouter.put('/vouchers/:id', updateVoucher);
accountingRouter.delete('/vouchers/:id', deleteVoucher);

accountingRouter.get('/ledger', listLedgerAccounts);
accountingRouter.post('/ledger/import', uploadExcelFile.single('file'), importLedgerAccounts);
accountingRouter.post('/ledger', createLedgerAccount);
accountingRouter.put('/ledger/:id', updateLedgerAccount);
accountingRouter.delete('/ledger/:id', deleteLedgerAccount);

accountingRouter.get('/journal-entries', listJournalEntries);
accountingRouter.post('/journal-entries/import', uploadExcelFile.single('file'), importJournalEntries);
accountingRouter.post('/journal-entries', createJournalEntry);
accountingRouter.put('/journal-entries/:id', updateJournalEntry);
accountingRouter.delete('/journal-entries/:id', deleteJournalEntry);

accountingRouter.get('/trial-balance', getTrialBalance);
accountingRouter.get('/pnl', getPnlStatement);
accountingRouter.get('/balance-sheet', getBalanceSheet);

accountingRouter.get('/cash-book', listCashBookEntries);
accountingRouter.post('/cash-book', createCashBookEntry);
accountingRouter.put('/cash-book/:id', updateCashBookEntry);
accountingRouter.delete('/cash-book/:id', deleteCashBookEntry);

accountingRouter.get('/bank-book', listBankBookEntries);
accountingRouter.get('/bank-reconciliation', getBankReconciliation);
accountingRouter.put('/bank-reconciliation/:id', updateBankReconciliation);
accountingRouter.post('/bank-book', createBankBookEntry);
accountingRouter.put('/bank-book/:id', updateBankBookEntry);
accountingRouter.delete('/bank-book/:id', deleteBankBookEntry);

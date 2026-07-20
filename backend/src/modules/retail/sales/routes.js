import { Router } from 'express';
import {
  getNextNumber,
  listInvoices,
  getInvoice,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  sendInvoiceEmail,
} from './billing-invoicing/invoiceController.js';
import {
  getNextCreditNoteNumber,
  listCreditNotes,
  getCreditNote,
  createCreditNote,
  updateCreditNote,
  deleteCreditNote,
} from './credit-debit-note/creditNoteController.js';
import {
  getNextDebitNoteNumber,
  listDebitNotes,
  getDebitNote,
  createDebitNote,
  updateDebitNote,
  deleteDebitNote,
} from './credit-debit-note/debitNoteController.js';
import {
  getNextChallanNumber,
  listChallans,
  getChallan,
  createChallan,
  updateChallan,
  deleteChallan,
} from './delivery-challan/challanController.js';
import {
  getNextEInvoiceNumber,
  listEInvoices,
  getEInvoice,
  createEInvoice,
  updateEInvoice,
  deleteEInvoice,
} from './e-invoice/eInvoiceController.js';
import {
  getNextEWayBillNumber,
  listEWayBills,
  getEWayBill,
  createEWayBill,
  updateEWayBill,
  deleteEWayBill,
  generateViaGSP,
} from './e-way-bill/eWayBillController.js';
import {
  listPayments,
  recordPayment,
  deletePayment,
  listOutstanding,
} from './billing-invoicing/paymentController.js';
import {
  listCustomers,
  getCustomer,
  createCustomer,
  updateCustomer,
  deleteCustomer,
} from './billing-invoicing/customerController.js';
import {
  listProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
} from './billing-invoicing/productController.js';

export const salesRouter = Router();

// ── Invoice CRUD ─────────────────────────────────────────────────────────────
// Fixed routes must come before /:id to avoid Express treating them as id params
salesRouter.get('/invoices/next-number',  getNextNumber);
salesRouter.get('/invoices/outstanding',  listOutstanding);
salesRouter.get('/invoices',              listInvoices);
salesRouter.post('/invoices',             createInvoice);
salesRouter.get('/invoices/:id',          getInvoice);
salesRouter.put('/invoices/:id',          updateInvoice);
salesRouter.delete('/invoices/:id',       deleteInvoice);
salesRouter.post('/invoices/:id/send-email',  sendInvoiceEmail);
salesRouter.get('/invoices/:id/payments',     listPayments);
salesRouter.post('/invoices/:id/payments',    recordPayment);
salesRouter.delete('/payments/:id',           deletePayment);

// ── Credit Note CRUD ─────────────────────────────────────────────────────────
salesRouter.get('/credit-notes/next-number',  getNextCreditNoteNumber);
salesRouter.get('/credit-notes',              listCreditNotes);
salesRouter.post('/credit-notes',             createCreditNote);
salesRouter.get('/credit-notes/:id',          getCreditNote);
salesRouter.put('/credit-notes/:id',          updateCreditNote);
salesRouter.delete('/credit-notes/:id',       deleteCreditNote);

// ── Debit Note CRUD ──────────────────────────────────────────────────────────
salesRouter.get('/debit-notes/next-number',  getNextDebitNoteNumber);
salesRouter.get('/debit-notes',              listDebitNotes);
salesRouter.post('/debit-notes',             createDebitNote);
salesRouter.get('/debit-notes/:id',          getDebitNote);
salesRouter.put('/debit-notes/:id',          updateDebitNote);
salesRouter.delete('/debit-notes/:id',       deleteDebitNote);

// ── Delivery Challan CRUD ────────────────────────────────────────────────────
salesRouter.get('/challans/next-number',  getNextChallanNumber);
salesRouter.get('/challans',              listChallans);
salesRouter.post('/challans',             createChallan);
salesRouter.get('/challans/:id',          getChallan);
salesRouter.put('/challans/:id',          updateChallan);
salesRouter.delete('/challans/:id',       deleteChallan);

// ── E-Invoice CRUD ───────────────────────────────────────────────────────────
salesRouter.get('/e-invoices/next-number',  getNextEInvoiceNumber);
salesRouter.get('/e-invoices',              listEInvoices);
salesRouter.post('/e-invoices',             createEInvoice);
salesRouter.get('/e-invoices/:id',          getEInvoice);
salesRouter.put('/e-invoices/:id',          updateEInvoice);
salesRouter.delete('/e-invoices/:id',       deleteEInvoice);

// ── E-Way Bill CRUD ──────────────────────────────────────────────────────────
salesRouter.get('/e-way-bills/next-number',   getNextEWayBillNumber);
salesRouter.post('/e-way-bills/gsp-generate', generateViaGSP);
salesRouter.get('/e-way-bills',              listEWayBills);
salesRouter.post('/e-way-bills',             createEWayBill);
salesRouter.get('/e-way-bills/:id',          getEWayBill);
salesRouter.put('/e-way-bills/:id',          updateEWayBill);
salesRouter.delete('/e-way-bills/:id',       deleteEWayBill);

// ── Customer CRUD ────────────────────────────────────────────────────────────
salesRouter.get('/customers',             listCustomers);
salesRouter.post('/customers',            createCustomer);
salesRouter.get('/customers/:id',         getCustomer);
salesRouter.put('/customers/:id',         updateCustomer);
salesRouter.delete('/customers/:id',      deleteCustomer);

// ── Product / catalog CRUD ───────────────────────────────────────────────────
salesRouter.get('/products',              listProducts);
salesRouter.post('/products',             createProduct);
salesRouter.get('/products/:id',          getProduct);
salesRouter.put('/products/:id',          updateProduct);
salesRouter.delete('/products/:id',       deleteProduct);

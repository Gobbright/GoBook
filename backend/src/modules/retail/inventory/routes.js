import { Router } from 'express';

import {
  getProductStats,
  getNextProductCode,
  listProducts,
  getCategories,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  importProducts,
  uploadProductsFile,
} from './productController.js';
import {
  getNextStockInNumber,
  getStockInStats,
  listStockIn,
  getStockIn,
  createStockIn,
  updateStockIn,
  deleteStockIn,
  importStockIn,
} from './stockInController.js';
import { uploadExcelFile } from '../../../utils/excelImport.js';
import {
  getNextStockOutNumber,
  getStockOutStats,
  listStockOut,
  getStockOut,
  createStockOut,
  updateStockOut,
  deleteStockOut,
} from './stockOutController.js';
import {
  getWarehouseStats,
  listWarehouses,
  getWarehouse,
  createWarehouse,
  updateWarehouse,
  deleteWarehouse,
} from './warehouseController.js';
import { getAlertStats, listAlerts } from './alertsController.js';
import { getStockLedger, getStockSummary } from './reportController.js';

export const inventoryRouter = Router();

inventoryRouter.get('/reports/summary', getStockSummary);
inventoryRouter.get('/reports/ledger',  getStockLedger);

// ── Products ──────────────────────────────────────────────────────────────────
inventoryRouter.get('/products/stats',      getProductStats);
inventoryRouter.get('/products/next-code',  getNextProductCode);
inventoryRouter.get('/products/categories', getCategories);
inventoryRouter.post('/products/import',    uploadProductsFile.single('file'), importProducts);
inventoryRouter.get('/products',            listProducts);
inventoryRouter.post('/products',           createProduct);
inventoryRouter.get('/products/:id',        getProduct);
inventoryRouter.put('/products/:id',        updateProduct);
inventoryRouter.delete('/products/:id',     deleteProduct);

// ── Stock In ──────────────────────────────────────────────────────────────────
inventoryRouter.get('/stock-in/next-number', getNextStockInNumber);
inventoryRouter.get('/stock-in/stats',       getStockInStats);
inventoryRouter.post('/stock-in/import',     uploadExcelFile.single('file'), importStockIn);
inventoryRouter.get('/stock-in',             listStockIn);
inventoryRouter.post('/stock-in',            createStockIn);
inventoryRouter.get('/stock-in/:id',         getStockIn);
inventoryRouter.put('/stock-in/:id',         updateStockIn);
inventoryRouter.delete('/stock-in/:id',      deleteStockIn);

// ── Stock Out ─────────────────────────────────────────────────────────────────
inventoryRouter.get('/stock-out/next-number', getNextStockOutNumber);
inventoryRouter.get('/stock-out/stats',       getStockOutStats);
inventoryRouter.get('/stock-out',             listStockOut);
inventoryRouter.post('/stock-out',            createStockOut);
inventoryRouter.get('/stock-out/:id',         getStockOut);
inventoryRouter.put('/stock-out/:id',         updateStockOut);
inventoryRouter.delete('/stock-out/:id',      deleteStockOut);

// ── Warehouses ────────────────────────────────────────────────────────────────
inventoryRouter.get('/warehouses/stats', getWarehouseStats);
inventoryRouter.get('/warehouses',       listWarehouses);
inventoryRouter.post('/warehouses',      createWarehouse);
inventoryRouter.get('/warehouses/:id',   getWarehouse);
inventoryRouter.put('/warehouses/:id',   updateWarehouse);
inventoryRouter.delete('/warehouses/:id',deleteWarehouse);

// ── Alerts ────────────────────────────────────────────────────────────────────
inventoryRouter.get('/alerts/stats', getAlertStats);
inventoryRouter.get('/alerts',       listAlerts);

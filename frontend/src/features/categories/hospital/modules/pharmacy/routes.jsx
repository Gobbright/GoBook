import { BatchExpiryPage } from './BatchExpiryPage.jsx';
import { MedicinesPage } from './MedicinesPage.jsx';
import { MedicineDispensingPage } from './MedicineDispensingPage.jsx';
import { MedicineReturnsPage } from './MedicineReturnsPage.jsx';
import { PharmacyStockPage } from './PharmacyStockPage.jsx';
import { ExpiryAlertsPage } from './ExpiryAlertsPage.jsx';
import { SuppliersPage } from './SuppliersPage.jsx';

export const pharmacyRoutes = [
  { path: '/hospital/medicine-dispensing', element: <MedicineDispensingPage /> },
  { path: '/hospital/medicine-returns', element: <MedicineReturnsPage /> },
  { path: '/hospital/batch-expiry', element: <BatchExpiryPage /> },
  { path: '/hospital/medicines', element: <MedicinesPage /> },
  { path: '/hospital/pharmacy-stock', element: <PharmacyStockPage /> },
  { path: '/hospital/expiry-alerts', element: <ExpiryAlertsPage /> },
  { path: '/hospital/suppliers', element: <SuppliersPage /> },
];

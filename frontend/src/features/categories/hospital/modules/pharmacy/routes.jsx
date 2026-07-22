import { MedicinesPage } from './MedicinesPage.jsx';
import { PharmacyStockPage } from './PharmacyStockPage.jsx';
import { ExpiryAlertsPage } from './ExpiryAlertsPage.jsx';
import { SuppliersPage } from './SuppliersPage.jsx';

export const pharmacyRoutes = [
  { path: '/hospital/medicines', element: <MedicinesPage /> },
  { path: '/hospital/pharmacy-stock', element: <PharmacyStockPage /> },
  { path: '/hospital/expiry-alerts', element: <ExpiryAlertsPage /> },
  { path: '/hospital/suppliers', element: <SuppliersPage /> },
];

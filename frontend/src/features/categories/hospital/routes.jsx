import { clinicalRoutes } from './modules/clinical/routes.jsx';
import { laboratoryRoutes } from './modules/laboratory/routes.jsx';
import { medicalBillingRoutes } from './modules/medical-billing/routes.jsx';
import { patientManagementRoutes } from './modules/patient-management/routes.jsx';
import { pharmacyRoutes } from './modules/pharmacy/routes.jsx';

export const hospitalRoutes = [
  ...patientManagementRoutes,
  ...clinicalRoutes,
  ...laboratoryRoutes,
  ...pharmacyRoutes,
  ...medicalBillingRoutes,
];

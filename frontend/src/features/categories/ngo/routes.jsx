import { ngoBeneficiaryRoutes } from './modules/beneficiaries/routes.jsx';
import { ngoCampaignProjectRoutes } from './modules/campaigns-projects/routes.jsx';
import { ngoDashboardRoutes } from './modules/dashboard/routes.jsx';
import { ngoDonationRoutes } from './modules/donations/routes.jsx';
import { ngoDonorRoutes } from './modules/donors/routes.jsx';
import { ngoVolunteerRoutes } from './modules/volunteers/routes.jsx';

export const ngoRoutes = [
  ...ngoDashboardRoutes,
  ...ngoDonorRoutes,
  ...ngoDonationRoutes,
  ...ngoVolunteerRoutes,
  ...ngoBeneficiaryRoutes,
  ...ngoCampaignProjectRoutes,
];

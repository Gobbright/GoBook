import { clientsTendersRoutes } from './modules/clients-tenders/routes.jsx';
import { contractorsLabourRoutes } from './modules/contractors-labour/routes.jsx';
import { constructionDashboardRoutes } from './modules/dashboard/routes.jsx';
import { constructionMaterialRoutes } from './modules/materials/routes.jsx';
import { constructionProjectRoutes } from './modules/projects/routes.jsx';

export const constructionRoutes = [
  ...constructionDashboardRoutes,
  ...clientsTendersRoutes,
  ...constructionProjectRoutes,
  ...constructionMaterialRoutes,
  ...contractorsLabourRoutes,
];

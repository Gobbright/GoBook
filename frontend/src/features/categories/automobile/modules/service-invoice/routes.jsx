import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Service Invoice" category="Automobile" />;
}

export const automobileServiceInvoiceRoutes = [
  { path: '/automobile/service-invoice/estimate-to-invoice', element: page('Estimate -> Invoice') },
  { path: '/automobile/service-invoice/parts-labour-split', element: page('Parts + Labour Split') },
  { path: '/automobile/service-invoice/insurance-claim-billing', element: page('Insurance Claim Billing') },
];

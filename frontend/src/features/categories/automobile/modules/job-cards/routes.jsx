import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Job Cards" category="Automobile" />;
}

export const automobileJobCardRoutes = [
  { path: '/automobile/job-cards/create', element: page('Create Job Card') },
  { path: '/automobile/job-cards/technician-allocation', element: page('Technician Allocation') },
  { path: '/automobile/job-cards/estimate', element: page('Estimate') },
  { path: '/automobile/job-cards/whatsapp-approval-link', element: page('WhatsApp Approval Link') },
  { path: '/automobile/job-cards/status-tracking', element: page('Status Tracking') },
];

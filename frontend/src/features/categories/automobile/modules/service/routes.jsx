import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Service" category="Automobile" />;
}

export const automobileServiceRoutes = [
  { path: '/automobile/service/inspection', element: page('Inspection') },
  { path: '/automobile/service/repair', element: page('Repair') },
  { path: '/automobile/service/spare-parts', element: page('Spare Parts') },
  { path: '/automobile/service/labour-charges', element: page('Labour Charges') },
  { path: '/automobile/service/road-test', element: page('Road Test') },
  { path: '/automobile/service/delivery', element: page('Delivery') },
];

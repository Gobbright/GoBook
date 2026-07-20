import { ModulePlaceholderPage } from '../../../../../components/common/ModulePlaceholderPage.jsx';

function page(title) {
  return <ModulePlaceholderPage title={title} group="Beneficiaries" category="NGO" />;
}

export const ngoBeneficiaryRoutes = [
  { path: '/ngo/beneficiaries/register', element: page('Beneficiary Register') },
  { path: '/ngo/beneficiaries/assistance-records', element: page('Assistance Records') },
  { path: '/ngo/beneficiaries/impact-reporting', element: page('Impact Reporting') },
];

import { GenericModulePage } from '../../../../../components/common/GenericModulePage.jsx';

const GROUP = 'Beneficiaries';
const CATEGORY = 'NGO';

const ITEMS = [
  {
    path: '/ngo/beneficiaries/register', title: 'Beneficiary Register', fields: [
      { key: 'name', label: 'Beneficiary Name', required: true },
      { key: 'phone', label: 'Phone' },
      { key: 'address', label: 'Address', type: 'textarea' },
      { key: 'category', label: 'Category' },
    ],
  },
  {
    path: '/ngo/beneficiaries/assistance-records', title: 'Assistance Records', fields: [
      { key: 'beneficiaryName', label: 'Beneficiary Name', required: true },
      { key: 'assistanceType', label: 'Assistance Type' },
      { key: 'amount', label: 'Amount / Value', type: 'number' },
      { key: 'date', label: 'Date', type: 'date' },
    ],
  },
  {
    path: '/ngo/beneficiaries/impact-reporting', title: 'Impact Reporting', fields: [
      { key: 'programName', label: 'Program Name', required: true },
      { key: 'beneficiariesServed', label: 'Beneficiaries Served', type: 'number' },
      { key: 'period', label: 'Period' },
      { key: 'notes', label: 'Notes', type: 'textarea' },
    ],
  },
];

export const ngoBeneficiaryRoutes = ITEMS.map(({ path, title, fields }) => ({
  path,
  element: <GenericModulePage title={title} group={GROUP} category={CATEGORY} moduleKey={path.slice(1)} fields={fields} />,
}));

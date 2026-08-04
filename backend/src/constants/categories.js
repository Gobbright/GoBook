export const CATEGORIES = [
  'retail', 'school', 'hospital', 'hotel',
  'manufacturing', 'construction', 'ngo', 'automobile', 'finance',
];

export const CATEGORY_LABELS = {
  retail: 'Retail Store',
  school: 'School',
  hospital: 'Hospital',
  hotel: 'Hotel',
  manufacturing: 'Manufacturing',
  construction: 'Construction',
  ngo: 'NGO',
  automobile: 'Automobile',
  finance: 'Finance',
};

// Backend modules that are only reachable by specific categories.
// Modules not listed here (gst, accounting, crm, inventory, hr-payroll, more-modules,
// settings, dashboard, ai, search) are common to every category.
export const EXCLUSIVE_MODULES_BY_CATEGORY = {
  retail: ['sales'],
  hospital: ['hospital', 'sales'],
  finance: ['finance'],
};

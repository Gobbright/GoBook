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

export const RETAIL_SUBCATEGORIES = [
  'food-grocery',
  'fashion-lifestyle',
  'home-living',
  'electronics-technology',
  'specialty-personal-needs',
  'business-specialty-retail',
];

export const RETAIL_SUBCATEGORY_LABELS = {
  'food-grocery': 'Food & Grocery',
  'fashion-lifestyle': 'Fashion & Lifestyle',
  'home-living': 'Home & Living',
  'electronics-technology': 'Electronics & Technology',
  'specialty-personal-needs': 'Specialty & Personal Needs',
  'business-specialty-retail': 'Business & Specialty Retail',
};

// Backend modules that are only reachable by specific categories.
// Modules not listed here (gst, accounting, crm, inventory, hr-payroll, more-modules,
// settings, dashboard, ai, search) are common to every category.
export const EXCLUSIVE_MODULES_BY_CATEGORY = {
  retail: ['sales'],
  hospital: ['hospital', 'sales'],
  finance: ['finance'],
};

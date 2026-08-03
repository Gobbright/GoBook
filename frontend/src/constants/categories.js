export const CATEGORIES = [
  { value: 'retail', label: 'Retail Store', icon: 'Store' },
  { value: 'school', label: 'School', icon: 'GraduationCap' },
  { value: 'hospital', label: 'Hospital', icon: 'Hospital' },
  { value: 'hotel', label: 'Hotel', icon: 'Building2' },
  { value: 'manufacturing', label: 'Manufacturing', icon: 'Factory' },
  { value: 'construction', label: 'Construction', icon: 'HardHat' },
  { value: 'ngo', label: 'NGO', icon: 'Users' },
  { value: 'automobile', label: 'Automobile', icon: 'Car' },
  { value: 'finance', label: 'Finance', icon: 'Wallet' },
];

export const CATEGORY_LABELS = Object.fromEntries(CATEGORIES.map((c) => [c.value, c.label]));

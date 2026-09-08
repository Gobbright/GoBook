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

export const RETAIL_SUBCATEGORIES = [
  {
    value: 'food-grocery',
    label: 'Food & Grocery',
    includes: 'Grocery, supermarket, fruits, bakery, general stores',
  },
  {
    value: 'fashion-lifestyle',
    label: 'Fashion & Lifestyle',
    includes: 'Apparel, footwear, jewellery, watches, beauty care',
  },
  {
    value: 'home-living',
    label: 'Home & Living',
    includes: 'Furniture, home decor, kitchen, hardware, electrical',
  },
  {
    value: 'electronics-technology',
    label: 'Electronics & Technology',
    includes: 'Electronics, appliances, mobiles, computers, accessories',
  },
  {
    value: 'specialty-personal-needs',
    label: 'Specialty & Personal Needs',
    includes: 'Automotive, sports, toys, books, pharmacy, healthcare',
  },
  {
    value: 'business-specialty-retail',
    label: 'Business & Specialty Retail',
    includes: 'Flowers, agriculture, gifts, wholesale, distribution',
  },
];

export const RETAIL_SUBCATEGORY_LABELS = Object.fromEntries(RETAIL_SUBCATEGORIES.map((c) => [c.value, c.label]));

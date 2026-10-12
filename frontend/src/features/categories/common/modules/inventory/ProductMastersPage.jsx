import { useState } from 'react';

import { BrandsPage } from './BrandsPage.jsx';
import { CategoriesPage } from './CategoriesPage.jsx';
import { SubcategoriesPage } from './SubcategoriesPage.jsx';

const tabs = [
  { key: 'categories', label: 'Categories' },
  { key: 'subcategories', label: 'Subcategories' },
  { key: 'brands', label: 'Brands' },
];

export function ProductMastersPage() {
  const [activeTab, setActiveTab] = useState('categories');

  return (
    <div className="min-h-full bg-[#f6f8fb]">
      <div className="px-4 pt-4 md:px-7 md:pt-7">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0">
            <h1 className="m-0 text-[20px] md:text-[22px] font-bold text-[#111827]">Product Masters</h1>
            <p className="m-0 mt-0.5 text-[12px] md:text-[13px] leading-snug text-[#536173]">Manage product brand, category, and subcategory values for product creation dropdowns.</p>
          </div>
          <div className="grid w-full grid-cols-3 rounded-lg border border-[#dbe4ef] bg-white p-1 sm:inline-flex sm:w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`min-w-0 rounded-md border-0 px-2 py-2 text-[12px] sm:px-3 sm:text-[13px] font-semibold font-[inherit] cursor-pointer ${activeTab === tab.key ? 'bg-blue-600 text-white shadow-sm' : 'bg-white text-[#374151] hover:bg-[#f8fafc]'}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="[&>div]:pt-0">
        {activeTab === 'categories' && <CategoriesPage />}
        {activeTab === 'subcategories' && <SubcategoriesPage />}
        {activeTab === 'brands' && <BrandsPage />}
      </div>
    </div>
  );
}

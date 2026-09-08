import { useState } from 'react';

import { BrandsPage } from './BrandsPage.jsx';
import { CategoriesPage } from './CategoriesPage.jsx';

const tabs = [
  { key: 'categories', label: 'Categories & Subcategories' },
  { key: 'brands', label: 'Brands' },
];

export function ProductMastersPage() {
  const [activeTab, setActiveTab] = useState('categories');

  return (
    <div className="min-h-full bg-[#f6f8fb]">
      <div className="px-7 pt-7">
        <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="m-0 text-[22px] font-bold text-[#111827]">Product Masters</h1>
            <p className="m-0 mt-0.5 text-[13px] text-[#536173]">Manage product brand, category, and subcategory values for product creation dropdowns.</p>
          </div>
          <div className="inline-flex w-fit rounded-lg border border-[#dbe4ef] bg-white p-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                className={`rounded-md border-0 px-3 py-2 text-[13px] font-semibold font-[inherit] cursor-pointer ${activeTab === tab.key ? 'bg-blue-600 text-white' : 'bg-white text-[#374151] hover:bg-[#f8fafc]'}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="[&>div]:pt-0">
        {activeTab === 'categories' ? <CategoriesPage /> : <BrandsPage />}
      </div>
    </div>
  );
}

import { Construction } from 'lucide-react';

export function ModulePlaceholderPage({ title, group, category }) {
  return (
    <div className="p-4 md:p-7">
      <div className="mb-5">
        <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
          <a className="text-blue-600 no-underline hover:underline" href="//dashboard">Home</a>
          <span>/</span><span>{group}</span><span>/</span><span>{title}</span>
        </nav>
        <h1 className="m-0 text-[22px] font-bold text-[#111827]">{title}</h1>
      </div>

      <div className="bg-white border border-[#dfe7f1] rounded-lg p-10 flex flex-col items-center text-center gap-3">
        <span className="w-12 h-12 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center">
          <Construction size={22} />
        </span>
        <div>
          <p className="m-0 text-[15px] font-semibold text-[#111827]">{title} is coming soon</p>
          <p className="m-0 text-[13px] text-[#536173] mt-1.5 max-w-md">
            This module is part of the {category} category and is under active development.
          </p>
        </div>
      </div>
    </div>
  );
}

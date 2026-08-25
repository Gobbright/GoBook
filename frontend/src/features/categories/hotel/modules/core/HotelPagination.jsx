import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';

export const PAGE_SIZE_OPTIONS = [5, 10, 25, 50];

export function paginateRows(rows, page, pageSize) {
  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const start = (currentPage - 1) * pageSize;
  return {
    currentPage,
    pageRows: rows.slice(start, start + pageSize),
    start: rows.length ? start + 1 : 0,
    end: Math.min(rows.length, start + pageSize),
    totalPages,
  };
}

export function PaginationFooter({ page, pageSize, total, start, end, totalPages, label = 'entries', onPageChange, onPageSizeChange }) {
  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);

  return (
    <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 text-[12px] text-slate-500 sm:flex-row sm:items-center sm:justify-between">
      <span>Showing {start} to {end} of {total} {label}</span>
      <div className="flex flex-wrap items-center gap-2">
        <SelectDropdown
          value={`${pageSize} / page`}
          onChange={(value) => {
            onPageSizeChange(Number(String(value).split(' ')[0]));
            onPageChange(1);
          }}
          options={PAGE_SIZE_OPTIONS.map((size) => `${size} / page`)}
          className="w-32"
        />
        <button type="button" disabled={page <= 1} onClick={() => onPageChange(page - 1)} className="h-8 rounded border border-slate-200 bg-white px-3 font-semibold text-slate-600 disabled:opacity-50">Prev</button>
        {pages.map((item) => (
          <button key={item} type="button" onClick={() => onPageChange(item)} className={`grid h-8 w-8 place-items-center rounded border text-[12px] font-semibold ${item === page ? 'border-blue-600 bg-blue-600 text-white' : 'border-slate-200 bg-white text-slate-600'}`}>
            {item}
          </button>
        ))}
        <button type="button" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)} className="h-8 rounded border border-slate-200 bg-white px-3 font-semibold text-slate-600 disabled:opacity-50">Next</button>
      </div>
    </div>
  );
}

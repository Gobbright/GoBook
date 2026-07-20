import { useState } from 'react';
import { FileDown, FileSpreadsheet } from 'lucide-react';

import { downloadExcel, downloadPdf } from '../../utils/exportData.js';

const BTN =
  'inline-flex items-center gap-1.5 px-3 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit] disabled:opacity-50 disabled:cursor-not-allowed';

export function ExportButtons({ title, filename, rows, columns, fetchRows }) {
  const [exporting, setExporting] = useState(false);
  const disabled = !rows || rows.length === 0;

  async function handleExport(format) {
    setExporting(true);
    try {
      const data = fetchRows ? await fetchRows() : rows;
      const payload = { title, filename, rows: data ?? [], columns };
      if (format === 'excel') downloadExcel(payload);
      else downloadPdf(payload);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        className={BTN}
        disabled={disabled || exporting}
        onClick={() => handleExport('excel')}
        title="Download filtered data as Excel"
      >
        <FileSpreadsheet size={14} />
        {exporting ? 'Preparing...' : 'Excel'}
      </button>
      <button
        type="button"
        className={BTN}
        disabled={disabled || exporting}
        onClick={() => handleExport('pdf')}
        title="Download filtered data as PDF"
      >
        <FileDown size={14} />
        {exporting ? 'Preparing...' : 'PDF'}
      </button>
    </div>
  );
}

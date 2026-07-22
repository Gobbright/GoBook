import { useRef, useState } from 'react';
import { Plus, Upload } from 'lucide-react';

import { importModuleRecords } from '../../../../services/moduleRecordsService.js';

export function PageHeader({ title, group, subtitle, actionLabel, onAction, moduleKey, fields, onImported }) {
  const fileInputRef = useRef(null);
  const [pendingFile, setPendingFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState(null);

  function handlePickFile() {
    fileInputRef.current?.click();
  }

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setResult(null);
    setPendingFile(file);
  }

  async function confirmImport() {
    const file = pendingFile;
    if (!file) return;
    setPendingFile(null);
    setImporting(true);
    try {
      const res = await importModuleRecords(moduleKey, fields, file);
      setResult(res);
      onImported?.();
    } catch (err) {
      setResult({ error: err.message || 'Import failed' });
    } finally {
      setImporting(false);
    }
  }

  const canImport = Boolean(moduleKey && fields);

  return (
    <div className="mb-5">
      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>›</span><span>{group}</span><span>›</span><span>{title}</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold text-[#111827]">{title}</h1>
          {subtitle && <p className="m-0 text-[13px] text-[#536173] mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex gap-2 self-start">
          {canImport && (
            <>
              <input ref={fileInputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFileChange} />
              <button
                type="button"
                disabled={importing}
                onClick={handlePickFile}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit] disabled:opacity-60"
              >
                <Upload size={14} />
                {importing ? 'Importing...' : 'Import Excel'}
              </button>
            </>
          )}
          {actionLabel && (
            <button
              type="button"
              onClick={onAction}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]"
            >
              <Plus size={14} strokeWidth={2.5} />
              {actionLabel}
            </button>
          )}
        </div>
      </div>

      {pendingFile && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={(e) => e.target === e.currentTarget && setPendingFile(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-100 mx-4 p-6">
            <h2 className="text-[16px] font-bold text-[#111827] mb-2">Import {title}</h2>
            <p className="text-[13px] text-[#536173] mb-5">
              Import records from <span className="font-medium text-[#111827]">{pendingFile.name}</span>? Column headers are matched to fields automatically.
            </p>
            <div className="flex gap-3 justify-end">
              <button type="button" onClick={() => setPendingFile(null)} className="px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]">No</button>
              <button type="button" onClick={confirmImport} className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]">Yes, Import</button>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className={`mt-4 px-4 py-3 rounded-lg text-[13px] border ${result.error ? 'bg-red-50 border-red-100 text-red-700' : 'bg-green-50 border-green-100 text-green-700'}`}>
          {result.error ? (
            <div>{result.error}</div>
          ) : (
            <>
              <div className="font-medium">
                Import complete: {result.imported} added
                {result.skipped > 0 && `, ${result.skipped} skipped`}.
              </div>
              {result.errors?.length > 0 && (
                <ul className="mt-1.5 list-disc pl-5 text-[12px]">
                  {result.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
                  {result.errors.length > 5 && <li>...and {result.errors.length - 5} more</li>}
                </ul>
              )}
            </>
          )}
          <button type="button" onClick={() => setResult(null)} className="mt-1.5 text-[12px] underline bg-transparent border-0 cursor-pointer p-0 text-inherit font-[inherit]">Dismiss</button>
        </div>
      )}
    </div>
  );
}

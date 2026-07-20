import { useRef, useState } from 'react';

export function ImportExcelButton({ label = 'Import Excel', onImport, onDone, className = '' }) {
  const inputRef = useRef(null);
  const [importing, setImporting] = useState(false);

  async function handleFile(e) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !onImport) return;

    const formData = new FormData();
    formData.append('file', file);
    setImporting(true);
    try {
      const result = await onImport(formData);
      onDone?.(result);
    } catch (err) {
      onDone?.({ error: err.message || 'Import failed' });
    } finally {
      setImporting(false);
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept=".xlsx" className="hidden" onChange={handleFile} />
      <button
        className={`inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit] disabled:opacity-60 ${className}`}
        type="button"
        disabled={importing}
        onClick={() => inputRef.current?.click()}
      >
        <svg fill="none" height="14" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="14">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" x2="12" y1="3" y2="15" />
        </svg>
        {importing ? 'Importing...' : label}
      </button>
    </>
  );
}

export function ImportResultAlert({ result, onDismiss }) {
  if (!result) return null;
  const failed = Boolean(result.error);
  return (
    <div className={`mb-5 px-4 py-3 rounded-lg text-[13px] border ${failed ? 'bg-red-50 border-red-100 text-red-700' : 'bg-green-50 border-green-100 text-green-700'}`}>
      {failed ? (
        <div>{result.error}</div>
      ) : (
        <div>
          <span className="font-medium">
            Import complete: {result.imported ?? 0} added, {result.updated ?? 0} updated
            {(result.skipped ?? 0) > 0 && `, ${result.skipped} skipped`}.
          </span>
          {result.errors?.length > 0 && (
            <ul className="mt-1.5 list-disc pl-5 text-[12px]">
              {result.errors.slice(0, 5).map((err, i) => <li key={i}>{err}</li>)}
              {result.errors.length > 5 && <li>...and {result.errors.length - 5} more</li>}
            </ul>
          )}
        </div>
      )}
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="mt-1.5 text-[12px] underline bg-transparent border-0 cursor-pointer p-0 text-inherit font-[inherit]">
          Dismiss
        </button>
      )}
    </div>
  );
}

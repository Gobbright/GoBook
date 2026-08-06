import { useEffect, useMemo, useRef, useState } from 'react';
import { Download, RefreshCw, Trash2, Upload } from 'lucide-react';

import {
  deleteDataByPeriod,
  downloadDataBackup,
  getDataManagementSummary,
  importDataBackup,
} from '../../../../../services/dataManagementService.js';
import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';

const MONTHS = [
  { value: '', label: 'Full Year' },
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const PAGE_COPY = {
  export: {
    title: 'Export Data',
    subtitle: 'Download selected module data as one GoBook JSON backup file.',
    statLabel: 'Export Records',
  },
  import: {
    title: 'Import Data',
    subtitle: 'Import a GoBook backup into this login. Ownership is saved to the current user.',
    statLabel: 'Import Collections',
  },
  delete: {
    title: 'Delete Period',
    subtitle: 'Delete selected module records by month or year for this current login only.',
    statLabel: 'Delete Eligible',
  },
};

function currentYear() {
  return String(new Date().getFullYear());
}

function ResultAlert({ result }) {
  if (!result) return null;
  const ok = !result.error;
  return (
    <div className={`border rounded-md px-4 py-3 text-[13px] ${ok ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'}`}>
      <div>{result.message}</div>
      {result.errors?.length > 0 && (
        <ul className="mt-2 mb-0 list-disc pl-5 text-[12px]">
          {result.errors.slice(0, 5).map((error, index) => <li key={`${error}-${index}`}>{error}</li>)}
          {result.errors.length > 5 && <li>and {result.errors.length - 5} more</li>}
        </ul>
      )}
    </div>
  );
}

function CollectionSelector({ collections, selected, onToggle, onSelectAll, onClear, action }) {
  return (
    <div className="bg-white border border-[#dfe7f1] rounded-lg p-4">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        <div>
          <h2 className="m-0 text-[15px] font-semibold text-[#111827]">Data Collections</h2>
          <p className="m-0 mt-0.5 text-[12.5px] text-[#536173]">Select which module data should be used for {action}.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onSelectAll} className="px-3 py-1.5 text-[12px] font-medium bg-white border border-[#dbe4ef] rounded-md text-[#374151] cursor-pointer hover:bg-gray-50 font-[inherit]">All</button>
          <button type="button" onClick={onClear} className="px-3 py-1.5 text-[12px] font-medium bg-white border border-[#dbe4ef] rounded-md text-[#374151] cursor-pointer hover:bg-gray-50 font-[inherit]">Clear</button>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {collections.map((collection) => (
          <label key={collection.key} className="flex items-center justify-between gap-3 border border-[#edf2f7] rounded-md px-3 py-2 cursor-pointer hover:bg-[#f8fafc]">
            <span className="flex items-center gap-2 min-w-0">
              <input
                type="checkbox"
                checked={selected.includes(collection.key)}
                onChange={() => onToggle(collection.key)}
                className="w-4 h-4 accent-blue-600 flex-none"
              />
              <span className="text-[13px] text-[#111827] truncate">{collection.label}</span>
            </span>
            <span className="text-[12px] text-[#536173] bg-[#f1f5f9] rounded px-2 py-0.5 flex-none">{collection.count}</span>
          </label>
        ))}
      </div>
    </div>
  );
}

export function DataManagementPage({ tool = 'export' }) {
  const activeTool = PAGE_COPY[tool] ? tool : 'export';
  const copy = PAGE_COPY[activeTool];
  const [collections, setCollections] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState('');
  const [result, setResult] = useState(null);
  const [importMode, setImportMode] = useState('merge');
  const [year, setYear] = useState(currentYear());
  const [month, setMonth] = useState('');
  const fileInputRef = useRef(null);

  const selectedCount = selected.length;
  const totalRecords = useMemo(
    () => collections.reduce((sum, collection) => sum + (selected.includes(collection.key) ? collection.count : 0), 0),
    [collections, selected],
  );
  const selectedDeletable = useMemo(
    () => selected.filter((key) => collections.find((collection) => collection.key === key)?.deletable),
    [collections, selected],
  );
  const statValue = activeTool === 'delete' ? selectedDeletable.length : totalRecords;

  async function loadSummary() {
    setLoading(true);
    try {
      const data = await getDataManagementSummary();
      setCollections(data.collections || []);
      setSelected((current) => current.length ? current.filter((key) => data.collections?.some((c) => c.key === key)) : (data.collections || []).map((c) => c.key));
    } catch (err) {
      setResult({ error: true, message: err.message || 'Unable to load data summary' });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSummary();
  }, []);

  useEffect(() => {
    setResult(null);
  }, [activeTool]);

  function toggleCollection(key) {
    setSelected((current) => current.includes(key) ? current.filter((item) => item !== key) : [...current, key]);
  }

  async function handleExport() {
    setWorking('export');
    setResult(null);
    try {
      await downloadDataBackup(selected);
      setResult({ message: `Backup exported for ${selectedCount || 'all'} collection${selectedCount === 1 ? '' : 's'}.` });
    } catch (err) {
      setResult({ error: true, message: err.message || 'Export failed' });
    } finally {
      setWorking('');
    }
  }

  async function handleImportFile(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    if (importMode === 'replace') {
      const ok = window.confirm('Replace mode will delete the selected current data first, then import the backup. Continue?');
      if (!ok) return;
    }

    setWorking('import');
    setResult(null);
    try {
      const data = await importDataBackup({ file, mode: importMode, collections: selected });
      setResult({
        message: `Import complete: ${data.imported || 0} added, ${data.updated || 0} updated, ${data.skipped || 0} skipped${data.deletedBeforeImport ? `, ${data.deletedBeforeImport} old records removed first` : ''}.`,
        errors: data.errors || [],
      });
      loadSummary();
    } catch (err) {
      setResult({ error: true, message: err.message || 'Import failed' });
    } finally {
      setWorking('');
    }
  }

  async function handleDeletePeriod() {
    if (!year.trim()) {
      setResult({ error: true, message: 'Year is required' });
      return;
    }
    const periodLabel = month ? `${MONTHS.find((item) => item.value === month)?.label} ${year}` : year;
    const ok = window.confirm(`Delete selected data for ${periodLabel}? This affects only your current login data.`);
    if (!ok) return;

    setWorking('delete');
    setResult(null);
    try {
      const data = await deleteDataByPeriod({ year, month, collections: selectedDeletable });
      setResult({ message: `Deleted ${data.deleted || 0} record${data.deleted === 1 ? '' : 's'} for ${periodLabel}.` });
      loadSummary();
    } catch (err) {
      setResult({ error: true, message: err.message || 'Delete failed' });
    } finally {
      setWorking('');
    }
  }

  function renderActionPanel() {
    if (activeTool === 'import') {
      return (
        <div className="bg-white border border-[#dfe7f1] rounded-lg p-4">
          <h2 className="m-0 text-[15px] font-semibold text-[#111827]">Import Data</h2>
          <p className="m-0 mt-1 text-[12.5px] text-[#536173]">Import a GoBook backup into this login. Ownership is saved to the current user.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <label className={`border rounded-md p-3 cursor-pointer ${importMode === 'merge' ? 'border-blue-500 bg-blue-50' : 'border-[#dbe4ef] bg-white'}`}>
              <input type="radio" className="sr-only" checked={importMode === 'merge'} onChange={() => setImportMode('merge')} />
              <span className="block text-[13px] font-semibold text-[#111827]">Merge</span>
              <span className="block text-[11.5px] text-[#536173] mt-0.5">Add or update</span>
            </label>
            <label className={`border rounded-md p-3 cursor-pointer ${importMode === 'replace' ? 'border-blue-500 bg-blue-50' : 'border-[#dbe4ef] bg-white'}`}>
              <input type="radio" className="sr-only" checked={importMode === 'replace'} onChange={() => setImportMode('replace')} />
              <span className="block text-[13px] font-semibold text-[#111827]">Replace</span>
              <span className="block text-[11.5px] text-[#536173] mt-0.5">Delete first</span>
            </label>
          </div>
          <input ref={fileInputRef} type="file" accept="application/json,.json" className="hidden" onChange={handleImportFile} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={!!working || selected.length === 0}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 disabled:opacity-60 font-[inherit]"
          >
            <Upload size={16} /> {working === 'import' ? 'Importing...' : 'Import Backup'}
          </button>
        </div>
      );
    }

    if (activeTool === 'delete') {
      return (
        <div className="bg-white border border-red-100 rounded-lg p-4">
          <h2 className="m-0 text-[15px] font-semibold text-[#991b1b]">Delete Period</h2>
          <p className="m-0 mt-1 text-[12.5px] text-[#7f1d1d]">Deletes selected module records only for this current login.</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <input
              type="number"
              min="2000"
              max="2100"
              value={year}
              onChange={(event) => setYear(event.target.value)}
              className="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit]"
              placeholder="Year"
            />
            <SelectDropdown
              value={month}
              onChange={setMonth}
              buttonClassName="border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] bg-white"
              options={MONTHS}
            />
          </div>
          <button
            type="button"
            onClick={handleDeletePeriod}
            disabled={!!working || selectedDeletable.length === 0}
            className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-medium text-white bg-red-600 border-0 rounded-md cursor-pointer hover:bg-red-700 disabled:opacity-60 font-[inherit]"
          >
            <Trash2 size={16} /> {working === 'delete' ? 'Deleting...' : 'Delete Selected Period'}
          </button>
        </div>
      );
    }

    return (
      <div className="bg-white border border-[#dfe7f1] rounded-lg p-4">
        <h2 className="m-0 text-[15px] font-semibold text-[#111827]">Export Data</h2>
        <p className="m-0 mt-1 text-[12.5px] text-[#536173]">Download selected module data as one GoBook JSON backup file.</p>
        <button
          type="button"
          onClick={handleExport}
          disabled={!!working || selected.length === 0}
          className="mt-4 w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-[13px] font-medium text-white bg-blue-600 border-0 rounded-md cursor-pointer hover:bg-blue-700 disabled:opacity-60 font-[inherit]"
        >
          <Download size={16} /> {working === 'export' ? 'Exporting...' : 'Export Backup'}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-7">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="/dashboard">Home</a>
            <span>&gt;</span><span>Data Management</span><span>&gt;</span><span>{copy.title}</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold text-[#111827]">{copy.title}</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">{copy.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={loadSummary}
          disabled={loading || !!working}
          className="inline-flex items-center gap-2 px-3 py-2 text-[13px] font-medium bg-white border border-[#dbe4ef] rounded-md text-[#374151] cursor-pointer hover:bg-gray-50 disabled:opacity-60 font-[inherit]"
        >
          <RefreshCw size={15} /> Refresh
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
        <div className="bg-white border border-[#dfe7f1] rounded-lg p-4">
          <p className="m-0 text-[12px] text-[#536173]">Selected Collections</p>
          <p className="m-0 mt-1 text-[24px] font-bold text-[#111827]">{selectedCount}</p>
        </div>
        <div className="bg-white border border-[#dfe7f1] rounded-lg p-4">
          <p className="m-0 text-[12px] text-[#536173]">Selected Records</p>
          <p className="m-0 mt-1 text-[24px] font-bold text-[#111827]">{totalRecords}</p>
        </div>
        <div className="bg-white border border-[#dfe7f1] rounded-lg p-4">
          <p className="m-0 text-[12px] text-[#536173]">{copy.statLabel}</p>
          <p className="m-0 mt-1 text-[24px] font-bold text-[#111827]">{statValue}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        <div className="space-y-4">
          <CollectionSelector
            collections={collections}
            selected={selected}
            action={copy.title.toLowerCase()}
            onToggle={toggleCollection}
            onSelectAll={() => setSelected(collections.map((collection) => collection.key))}
            onClear={() => setSelected([])}
          />
          <ResultAlert result={result} />
        </div>
        <div>{renderActionPanel()}</div>
      </div>

      {loading && <p className="mt-4 text-[13px] text-blue-600">Loading data summary...</p>}
    </div>
  );
}

export function ExportDataPage() {
  return <DataManagementPage tool="export" />;
}

export function ImportDataPage() {
  return <DataManagementPage tool="import" />;
}

export function DeletePeriodPage() {
  return <DataManagementPage tool="delete" />;
}

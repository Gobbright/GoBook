import { useEffect, useMemo, useState } from 'react';
import { Activity, Building2, Database, Download, File, HardDrive, RefreshCw, Upload } from 'lucide-react';

import { AdminLayout } from '../AdminLayout.jsx';
import { downloadAdminCollectionExport, downloadAdminStorageFile, fetchDailyStorageReports, fetchStorageBusinesses, fetchStorageFiles, fetchStorageOverview, uploadAdminStorageFile } from '../adminService.js';

function bytes(value) {
  const size = Number(value || 0);
  if (size < 1024) return `${size} B`;
  if (size < 1024 ** 2) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 ** 3) return `${(size / 1024 ** 2).toFixed(1)} MB`;
  return `${(size / 1024 ** 3).toFixed(2)} GB`;
}

function csvCell(value) {
  let text = String(value ?? '');
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

function downloadCsv(filename, headers, rows) {
  const csv = [headers.map(csvCell).join(','), ...rows.map((row) => row.map(csvCell).join(','))].join('\r\n');
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function Card({ icon: Icon, label, value, hint }) {
  return <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"><div className="mb-3 flex items-center gap-2 text-slate-500 dark:text-slate-400"><Icon size={17} /><span className="text-xs font-black uppercase tracking-wide">{label}</span></div><p className="m-0 text-2xl font-black text-slate-900 dark:text-white">{value}</p>{hint ? <p className="m-0 mt-1 text-xs text-slate-500">{hint}</p> : null}</div>;
}

function TableShell({ children }) {
  return <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">{children}</div>;
}

const th = 'whitespace-nowrap border-b border-slate-200 bg-slate-50 px-4 py-3 text-left text-xs font-black uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:bg-slate-950/50';
const td = 'whitespace-nowrap border-b border-slate-100 px-4 py-3 text-sm text-slate-700 dark:border-slate-800 dark:text-slate-300';

export function AdminStoragePage({ type = 'overview' }) {
  const [overview, setOverview] = useState(null);
  const [files, setFiles] = useState([]);
  const [businesses, setBusinesses] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [exporting, setExporting] = useState('');
  const [error, setError] = useState('');
  const [file, setFile] = useState(null);
  const [businessId, setBusinessId] = useState('');

  async function load() {
    try {
      setLoading(true);
      setError('');
      const [summary, fileData, businessData, reportData] = await Promise.all([
        fetchStorageOverview(),
        fetchStorageFiles(),
        fetchStorageBusinesses(),
        fetchDailyStorageReports(30),
      ]);
      setOverview(summary);
      setFiles(fileData.files || []);
      setBusinesses(businessData.businesses || []);
      setReports(reportData.reports || []);
    } catch (loadError) {
      setError(loadError.message || 'Unable to load storage information');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const refresh = () => load();
    window.addEventListener('gobook:admin-refresh', refresh);
    return () => window.removeEventListener('gobook:admin-refresh', refresh);
  }, []);

  async function uploadFile(event) {
    event.preventDefault();
    if (!file) return;
    const formElement = event.currentTarget;
    try {
      setUploading(true);
      const form = new FormData();
      form.append('file', file);
      form.append('kind', 'admin-upload');
      if (businessId) form.append('businessId', businessId);
      await uploadAdminStorageFile(form);
      setFile(null);
      setBusinessId('');
      formElement.reset();
      await load();
    } catch (uploadError) {
      setError(uploadError.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  }

  function exportUsersCsv() {
    const rows = (overview?.businesses || []).map((row) => [
      row.businessName,
      row.ownerName,
      row.ownerEmail,
      row.userCount,
      row.category,
      row.databaseBytes,
      row.files,
      row.fileBytes,
      row.bytes,
    ]);
    downloadCsv(`gobooks-all-user-size-${new Date().toISOString().slice(0, 10)}.csv`, ['Business / Website', 'Owner', 'Owner Email', 'Users', 'Category', 'Database Bytes', 'GridFS Files', 'GridFS Bytes', 'Total Bytes'], rows);
  }

  function exportCollectionsSummaryCsv() {
    const rows = (overview?.collections || []).map((row) => [row.name, row.documents, row.dataSize, row.storageSize, row.indexes]);
    downloadCsv(`gobooks-db-collections-${new Date().toISOString().slice(0, 10)}.csv`, ['Collection', 'Documents', 'Data Bytes', 'Allocated Storage Bytes', 'Indexes'], rows);
  }

  async function exportCollectionData(collection = '') {
    try {
      setExporting(collection || 'all');
      setError('');
      await downloadAdminCollectionExport(collection);
    } catch (exportError) {
      setError(exportError.message || 'Database export failed');
    } finally {
      setExporting('');
    }
  }

  const heading = useMemo(() => ({
    overview: ['Storage Overview', 'MongoDB database and GridFS usage in one place'],
    files: ['GridFS Files', 'PDF, image, and video files stored inside MongoDB'],
    businesses: ['All User Storage Size', 'User, business, and website-wise database plus GridFS usage'],
    collections: ['Database Collections', 'All tables/collections and their storage usage'],
    'daily-reports': ['Daily Reports', 'Registrations, payments, revenue, and storage uploads'],
  }[type] || ['Storage', 'GoBooks storage administration']), [type]);

  return <AdminLayout>
    <div className="min-h-screen p-4 text-slate-900 dark:text-slate-100 md:p-6">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div><h2 className="m-0 text-2xl font-black">{heading[0]}</h2><p className="m-0 mt-1 text-sm text-slate-500">{heading[1]}</p></div>
          <div className="flex flex-wrap justify-end gap-2">
            {type === 'businesses' ? <button type="button" onClick={exportUsersCsv} disabled={!overview} className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 text-sm font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300"><Download size={15} /> Export Users CSV</button> : null}
            {type === 'collections' ? <>
              <button type="button" onClick={exportCollectionsSummaryCsv} disabled={!overview} className="inline-flex h-10 items-center gap-2 rounded-lg border border-emerald-200 bg-white px-4 text-sm font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-50 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-300"><Download size={15} /> Export Summary CSV</button>
              <button type="button" onClick={() => exportCollectionData()} disabled={!overview || Boolean(exporting)} className="inline-flex h-10 items-center gap-2 rounded-lg border border-violet-200 bg-white px-4 text-sm font-bold text-violet-700 hover:bg-violet-50 disabled:opacity-50 dark:border-violet-900 dark:bg-slate-900 dark:text-violet-300">{exporting === 'all' ? <RefreshCw size={15} className="animate-spin" /> : <Download size={15} />} Export All Data JSON</button>
            </> : null}
            <button type="button" onClick={load} disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-60"><RefreshCw size={15} className={loading ? 'animate-spin' : ''} /> Refresh</button>
          </div>
        </div>
        {error ? <div className="mb-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/30 dark:text-red-300">{error}</div> : null}
        {loading && !overview ? <div className="grid min-h-64 place-items-center"><RefreshCw className="animate-spin text-blue-600" size={34} /></div> : null}

        {overview && type === 'overview' ? <>
          <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <Card icon={HardDrive} label="Total DB size" value={bytes(overview.database?.totalSize ?? (Number(overview.database?.storageSize || 0) + Number(overview.database?.indexSize || 0)))} hint={`${overview.database?.name} · storage + indexes`} />
            <Card icon={Activity} label={overview.database?.capacitySource === 'configured_database_quota' ? 'Free DB quota' : 'Free server storage'} value={bytes(overview.database?.freeSize)} hint={`${bytes(overview.database?.capacityUsed)} used of ${bytes(overview.database?.capacitySize)}`} />
            <Card icon={Database} label="Collection storage" value={bytes(overview.database?.storageSize)} hint={`${overview.database?.collections || 0} collections · ${bytes(overview.database?.dataSize)} logical data`} />
            <Card icon={File} label="GridFS storage" value={bytes(overview.gridfs?.bytes)} hint={`${overview.gridfs?.files || 0} stored files`} />
            <Card icon={Building2} label="Index storage" value={bytes(overview.database?.indexSize)} hint={`${overview.businesses?.length || 0} businesses tracked`} />
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            <TableShell><div className="border-b border-slate-200 p-4 font-black dark:border-slate-800">Storage by file type</div><table className="w-full border-collapse"><thead><tr><th className={th}>Type</th><th className={th}>Files</th><th className={th}>Storage</th></tr></thead><tbody>{(overview.gridfs?.byType || []).map((row) => <tr key={row.kind}><td className={td}>{row.kind}</td><td className={td}>{row.files}</td><td className={td}>{bytes(row.bytes)}</td></tr>)}</tbody></table></TableShell>
            <TableShell><div className="border-b border-slate-200 p-4 font-black dark:border-slate-800">Latest GridFS files</div><table className="w-full border-collapse"><thead><tr><th className={th}>File</th><th className={th}>Type</th><th className={th}>Size</th></tr></thead><tbody>{(overview.recentFiles || []).slice(0, 8).map((row) => <tr key={row.id}><td className={td}>{row.filename}</td><td className={td}>{row.kind}</td><td className={td}>{bytes(row.size)}</td></tr>)}</tbody></table></TableShell>
          </div>
        </> : null}

        {type === 'files' ? <>
          <form onSubmit={uploadFile} className="mb-5 grid gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/20 md:grid-cols-[1fr_260px_auto]">
            <input type="file" accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.mp4,.webm,.mov" onChange={(event) => setFile(event.target.files?.[0] || null)} required className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900" />
            <select value={businessId} onChange={(event) => setBusinessId(event.target.value)} className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"><option value="">GoBooks Platform</option>{businesses.map((business) => <option key={business._id} value={business._id}>{business.name} ({business.category})</option>)}</select>
            <button disabled={uploading} className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white disabled:opacity-60"><Upload size={15} /> {uploading ? 'Uploading...' : 'Upload'}</button>
          </form>
          <TableShell><table className="w-full border-collapse"><thead><tr><th className={th}>File</th><th className={th}>Kind</th><th className={th}>Content type</th><th className={th}>Size</th><th className={th}>Uploaded</th><th className={th}>Action</th></tr></thead><tbody>{files.map((row) => <tr key={row.id}><td className={td}>{row.filename}</td><td className={td}>{row.kind}</td><td className={td}>{row.contentType}</td><td className={td}>{bytes(row.size)}</td><td className={td}>{new Date(row.uploadedAt).toLocaleString('en-IN')}</td><td className={td}><button onClick={() => downloadAdminStorageFile(row.id)} className="inline-flex items-center gap-1 rounded-md border border-blue-200 px-2 py-1 text-xs font-bold text-blue-600"><Download size={13} /> Download</button></td></tr>)}</tbody></table></TableShell>
        </> : null}

        {type === 'businesses' ? <TableShell><table className="w-full border-collapse"><thead><tr><th className={th}>User / Business / Website</th><th className={th}>Owner email</th><th className={th}>Users</th><th className={th}>Category</th><th className={th}>Database data</th><th className={th}>GridFS files</th><th className={th}>GridFS size</th><th className={th}>Total used</th></tr></thead><tbody>{(overview?.businesses || []).map((row) => <tr key={row.businessId || 'platform'}><td className={td}><span className="font-bold">{row.businessName}</span>{row.ownerName ? <span className="block text-xs text-slate-500">{row.ownerName}</span> : null}</td><td className={td}>{row.ownerEmail || '-'}</td><td className={td}>{Number(row.userCount || 0).toLocaleString('en-IN')}</td><td className={td}>{row.category}</td><td className={td}>{bytes(row.databaseBytes)}</td><td className={td}>{row.files}</td><td className={td}>{bytes(row.fileBytes)}</td><td className={td}><span className="font-black text-blue-600 dark:text-blue-400">{bytes(row.bytes)}</span></td></tr>)}</tbody></table></TableShell> : null}

        {type === 'collections' ? <TableShell><table className="w-full border-collapse"><thead><tr><th className={th}>Collection / Table</th><th className={th}>Documents</th><th className={th}>Data</th><th className={th}>Allocated storage</th><th className={th}>Indexes</th><th className={th}>Export</th></tr></thead><tbody>{(overview?.collections || []).map((row) => <tr key={row.name}><td className={td}>{row.name}</td><td className={td}>{row.documents.toLocaleString('en-IN')}</td><td className={td}>{bytes(row.dataSize)}</td><td className={td}>{bytes(row.storageSize)}</td><td className={td}>{row.indexes}</td><td className={td}>{row.name === 'gobookFiles.chunks' || row.name.startsWith('system.') ? <span className="text-xs font-semibold text-slate-400">Use GridFS Files</span> : <button type="button" onClick={() => exportCollectionData(row.name)} disabled={Boolean(exporting)} className="inline-flex items-center gap-1 rounded-md border border-violet-200 px-2 py-1 text-xs font-bold text-violet-700 disabled:opacity-50 dark:border-violet-900 dark:text-violet-300">{exporting === row.name ? <RefreshCw size={13} className="animate-spin" /> : <Download size={13} />} Export JSON</button>}</td></tr>)}</tbody></table></TableShell> : null}

        {type === 'daily-reports' ? <TableShell><table className="w-full border-collapse"><thead><tr><th className={th}>Date</th><th className={th}>Registrations</th><th className={th}>Payments</th><th className={th}>Successful</th><th className={th}>Revenue</th><th className={th}>Files</th><th className={th}>Uploaded</th></tr></thead><tbody>{reports.map((row) => <tr key={row.date}><td className={td}><span className="inline-flex items-center gap-2"><Activity size={14} />{row.date}</span></td><td className={td}>{row.registrations}</td><td className={td}>{row.payments}</td><td className={td}>{row.successfulPayments}</td><td className={td}>₹{Number(row.revenue || 0).toLocaleString('en-IN')}</td><td className={td}>{row.files}</td><td className={td}>{bytes(row.uploadedBytes)}</td></tr>)}</tbody></table></TableShell> : null}
      </div>
    </div>
  </AdminLayout>;
}

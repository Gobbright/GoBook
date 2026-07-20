import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '../../../../../services/api.js';

const CATEGORIES = ['ID Proof', 'Address Proof', 'Certificates', 'Contracts', 'Other Documents'];
const FOLDER_COLORS = {
  'Employee Documents': '#2563eb',
  'ID Proof':           '#0891b2',
  'Address Proof':      '#16a34a',
  'Certificates':       '#7c3aed',
  'Contracts':          '#d97706',
  'Other Documents':    '#536173',
};
const CATEGORY_STYLES = {
  'ID Proof':       'bg-blue-100 text-blue-700',
  'Address Proof':  'bg-green-100 text-green-700',
  'Certificates':   'bg-purple-100 text-purple-700',
  'Contracts':      'bg-orange-100 text-orange-700',
  'Other Documents':'bg-gray-100 text-gray-600',
};
const TH = 'text-left text-xs font-semibold uppercase tracking-wide text-[#536173] px-5 py-3 border-b border-[#edf2f7]';
const TD = 'px-5 py-3.5 border-b border-[#f3f4f6] text-[13px]';
const IL = 'block text-[12px] font-medium text-[#374151] mb-1';
const IC = 'w-full border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] bg-white';

const EMPTY_FORM = { employee: '', empId: '', category: 'Other Documents', uploadedBy: 'Super Admin' };

function UploadModal({ onClose, onSaved }) {
  const [form, setForm]       = useState({ ...EMPTY_FORM });
  const [file, setFile]       = useState(null);
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');
  const fileRef               = useRef();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) { setError('Please select a file'); return; }
    setSaving(true); setError('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('employee',   form.employee);
      fd.append('empId',      form.empId);
      fd.append('category',   form.category);
      fd.append('uploadedBy', form.uploadedBy);
      await api.hrUploadDocument(fd);
      onSaved();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#edf2f7]">
          <h2 className="text-[16px] font-bold">Upload Document</h2>
          <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-[#536173] bg-transparent border-0 cursor-pointer text-lg" onClick={onClose} type="button">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 flex flex-col gap-4">
            {/* File drop zone */}
            <div
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-colors ${file ? 'border-blue-400 bg-blue-50' : 'border-[#dbe4ef] hover:border-blue-400 hover:bg-blue-50'}`}
              onClick={() => fileRef.current.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) setFile(f); }}
            >
              <input ref={fileRef} type="file" className="hidden" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.xlsx,.xls" onChange={(e) => setFile(e.target.files[0] || null)} />
              {file ? (
                <div className="flex items-center justify-center gap-2 text-blue-700">
                  <svg fill="none" height="16" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="16"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                  <span className="text-[13px] font-medium truncate max-w-62.5">{file.name}</span>
                  <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-red-400 hover:text-red-600 bg-transparent border-0 cursor-pointer text-[16px] leading-none">×</button>
                </div>
              ) : (
                <>
                  <svg className="mx-auto mb-2 text-[#9ca3af]" fill="none" height="28" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24" width="28"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
                  <p className="text-[13px] text-[#536173]">Click or drag a file here</p>
                  <p className="text-[11px] text-[#9ca3af] mt-0.5">PDF, DOC, DOCX, JPG, PNG, XLSX (max 20 MB)</p>
                </>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className={IL}>Employee Name</label>
                <input className={IC} placeholder="e.g. Rahul Sharma" value={form.employee} onChange={(e) => set('employee', e.target.value)} />
              </div>
              <div>
                <label className={IL}>Employee ID</label>
                <input className={IC} placeholder="e.g. EMP-001" value={form.empId} onChange={(e) => set('empId', e.target.value)} />
              </div>
              <div>
                <label className={IL}>Category</label>
                <select className={IC} value={form.category} onChange={(e) => set('category', e.target.value)}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className={IL}>Uploaded By</label>
                <input className={IC} placeholder="e.g. Super Admin" value={form.uploadedBy} onChange={(e) => set('uploadedBy', e.target.value)} />
              </div>
            </div>
          </div>
          {error && <p className="px-6 pb-2 text-[12px] text-red-600">{error}</p>}
          <div className="px-6 py-4 border-t border-[#edf2f7] flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit] disabled:opacity-60">
              {saving ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditModal({ doc, onClose, onSaved }) {
  const [form, setForm]     = useState({ employee: doc.employee, empId: doc.empId, category: doc.category, uploadedBy: doc.uploadedBy, name: doc.name });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('Document name is required'); return; }
    setSaving(true); setError('');
    try {
      await api.hrUpdateDocument(doc._id, form);
      onSaved();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#edf2f7]">
          <h2 className="text-[16px] font-bold">Edit Document</h2>
          <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-gray-100 text-[#536173] bg-transparent border-0 cursor-pointer text-lg" onClick={onClose} type="button">×</button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={IL}>Document Name</label>
              <input className={IC} value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div>
              <label className={IL}>Employee Name</label>
              <input className={IC} placeholder="e.g. Rahul Sharma" value={form.employee} onChange={(e) => set('employee', e.target.value)} />
            </div>
            <div>
              <label className={IL}>Employee ID</label>
              <input className={IC} placeholder="e.g. EMP-001" value={form.empId} onChange={(e) => set('empId', e.target.value)} />
            </div>
            <div>
              <label className={IL}>Category</label>
              <select className={IC} value={form.category} onChange={(e) => set('category', e.target.value)}>
                {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={IL}>Uploaded By</label>
              <input className={IC} value={form.uploadedBy} onChange={(e) => set('uploadedBy', e.target.value)} />
            </div>
          </div>
          {error && <p className="px-6 pb-2 text-[12px] text-red-600">{error}</p>}
          <div className="px-6 py-4 border-t border-[#edf2f7] flex justify-end gap-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-[13px] font-medium text-[#374151] bg-white border border-[#dbe4ef] rounded-md cursor-pointer hover:bg-gray-50 font-[inherit]">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit] disabled:opacity-60">
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export function DocumentsPage() {
  const [search, setSearch]             = useState('');
  const [activeFolder, setActiveFolder] = useState('Employee Documents');
  const [page, setPage]                 = useState(1);
  const [documents, setDocuments]       = useState([]);
  const [total, setTotal]               = useState(0);
  const [folderCounts, setFolderCounts] = useState({});
  const [loading, setLoading]           = useState(true);
  const [modal, setModal]               = useState(null); // null | 'upload' | doc-object

  const LIMIT = 10;

  const fetchFolderCounts = useCallback(async () => {
    try { setFolderCounts(await api.hrDocFolderCounts()); } catch (_) {}
  }, []);

  const fetchDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT };
      if (search)    params.search = search;
      if (activeFolder !== 'Employee Documents') params.category = activeFolder;
      const res = await api.hrListDocuments(params);
      setDocuments(res.data ?? []);
      setTotal(res.total ?? 0);
    } catch (_) { setDocuments([]); }
    finally { setLoading(false); }
  }, [search, activeFolder, page]);

  useEffect(() => { fetchFolderCounts(); }, [fetchFolderCounts]);
  useEffect(() => { setPage(1); }, [search, activeFolder]);
  useEffect(() => { fetchDocuments(); }, [fetchDocuments]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this document? The file will also be removed.')) return;
    try { await api.hrDeleteDocument(id); fetchDocuments(); fetchFolderCounts(); }
    catch (err) { alert(err.message); }
  };

  const handleSaved = () => { setModal(null); fetchDocuments(); fetchFolderCounts(); };

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  const folders = [
    { name: 'Employee Documents', color: FOLDER_COLORS['Employee Documents'] },
    ...CATEGORIES.map((c) => ({ name: c, color: FOLDER_COLORS[c] })),
  ];

  return (
    <div className="p-4 md:p-7">
      {modal === 'upload' && <UploadModal onClose={() => setModal(null)} onSaved={handleSaved} />}
      {modal && modal !== 'upload' && <EditModal doc={modal} onClose={() => setModal(null)} onSaved={handleSaved} />}

      <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4 mb-1">
        <div>
          <nav className="flex items-center gap-1 text-[13px] text-[#536173] mb-1">
            <a className="text-blue-600 no-underline hover:underline" href="#/dashboard">Home</a>
            <span>›</span><span>HR &amp; Payroll</span><span>›</span><span>Documents</span>
          </nav>
          <h1 className="m-0 text-[22px] font-bold">Documents</h1>
          <p className="m-0 text-[13px] text-[#536173] mt-0.5">Manage employee documents and files</p>
        </div>
        <button onClick={() => setModal('upload')} className="inline-flex items-center gap-1.5 px-4 py-2 text-[13px] font-medium text-white bg-blue-600 rounded-md cursor-pointer hover:bg-blue-700 border-0 font-[inherit]" type="button">
          <svg fill="none" height="14" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24" width="14"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
          Upload Document
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-5 mt-5">
        {/* Folders sidebar */}
        <div className="w-full lg:w-56 lg:flex-none bg-white border border-[#dfe7f1] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[#edf2f7]">
            <span className="text-[13px] font-semibold text-[#111827]">Folders</span>
          </div>
          <div className="py-2">
            {folders.map((folder) => {
              const count = folderCounts[folder.name] ?? 0;
              const active = activeFolder === folder.name;
              return (
                <button
                  key={folder.name}
                  type="button"
                  onClick={() => setActiveFolder(folder.name)}
                  className={`w-full flex items-center justify-between px-4 py-2.5 text-[13px] cursor-pointer border-0 font-[inherit] text-left transition-colors ${active ? 'bg-blue-50 text-blue-700 font-medium' : 'bg-transparent text-[#536173] hover:bg-gray-50'}`}
                >
                  <div className="flex items-center gap-2.5">
                    <svg fill="none" height="15" stroke={active ? '#2563eb' : folder.color} strokeWidth="2" viewBox="0 0 24 24" width="15"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg>
                    <span>{folder.name}</span>
                  </div>
                  <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${active ? 'bg-blue-100 text-blue-700' : 'bg-[#f3f4f6] text-[#536173]'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Documents table */}
        <div className="flex-1 min-w-0 bg-white border border-[#dfe7f1] rounded-xl">
          <div className="flex items-center gap-3 px-5 py-3.5 border-b border-[#edf2f7] flex-wrap">
            <div className="relative flex-1 min-w-45 max-w-xs">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-[#536173]" fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><circle cx="11" cy="11" r="8"/><line x1="21" x2="16.65" y1="21" y2="16.65"/></svg>
              <input className="border border-[#dbe4ef] rounded-md pl-8 pr-3 py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit]" placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className={TH}>Document Name</th>
                  <th className={TH}>Employee</th>
                  <th className={TH}>Category</th>
                  <th className={TH}>Uploaded By</th>
                  <th className={TH}>Uploaded On</th>
                  <th className={TH}>Size</th>
                  <th className={TH}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={7} className="px-5 py-8 text-center text-[13px] text-[#536173]">Loading...</td></tr>
                ) : documents.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-[13px] text-[#536173]">
                    No documents found.{' '}
                    <button className="text-blue-600 underline bg-transparent border-0 cursor-pointer font-[inherit] text-[13px]" onClick={() => setModal('upload')} type="button">Upload one now</button>
                  </td></tr>
                ) : documents.map((row) => (
                  <tr key={row._id} className="hover:bg-gray-50">
                    <td className={TD}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded flex items-center justify-center flex-none bg-red-50">
                          <svg fill="none" height="14" stroke="#dc2626" strokeWidth="2" viewBox="0 0 24 24" width="14"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
                        </div>
                        <span className="font-medium text-[#111827]">{row.name}</span>
                      </div>
                    </td>
                    <td className={`${TD} text-[#536173]`}>{row.employee}{row.empId ? ` (${row.empId})` : ''}</td>
                    <td className={TD}>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${CATEGORY_STYLES[row.category] ?? 'bg-gray-100 text-gray-600'}`}>
                        {row.category}
                      </span>
                    </td>
                    <td className={`${TD} text-[#536173]`}>{row.uploadedBy}</td>
                    <td className={`${TD} text-[#536173]`}>{row.uploadedOn}</td>
                    <td className={`${TD} text-[#536173]`}>{row.size}</td>
                    <td className={TD}>
                      <div className="flex items-center gap-1">
                        <a href={api.hrDocDownloadUrl(row._id)} download={row.name} className="w-7 h-7 flex items-center justify-center rounded hover:bg-blue-50 text-blue-500" title="Download">
                          <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>
                        </a>
                        <a href={api.hrDocViewUrl(row._id)} target="_blank" rel="noreferrer" className="w-7 h-7 flex items-center justify-center rounded hover:bg-green-50 text-green-500" title="View">
                          <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                        </a>
                        <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-yellow-50 text-yellow-500 bg-transparent border-0 cursor-pointer" title="Edit" type="button" onClick={() => setModal(row)}>
                          <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-red-400 bg-transparent border-0 cursor-pointer" title="Delete" type="button" onClick={() => handleDelete(row._id)}>
                          <svg fill="none" height="13" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" width="13"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-5 py-3 border-t border-[#edf2f7] flex justify-between text-[13px] text-[#536173]">
            <span>Showing {documents.length ? (page - 1) * LIMIT + 1 : 0}–{Math.min(page * LIMIT, total)} of {total} entries</span>
            <div className="flex items-center gap-1">
              <button className="px-2.5 py-1 rounded border border-[#dbe4ef] hover:bg-gray-50 text-[12px] bg-white font-[inherit] cursor-pointer" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} type="button">←</button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <button key={p} className={`px-2.5 py-1 rounded text-[12px] font-[inherit] cursor-pointer ${p === page ? 'bg-blue-600 text-white border-0' : 'border border-[#dbe4ef] bg-white hover:bg-gray-50'}`} onClick={() => setPage(p)} type="button">{p}</button>
              ))}
              <button className="px-2.5 py-1 rounded border border-[#dbe4ef] hover:bg-gray-50 text-[12px] bg-white font-[inherit] cursor-pointer" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} type="button">→</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

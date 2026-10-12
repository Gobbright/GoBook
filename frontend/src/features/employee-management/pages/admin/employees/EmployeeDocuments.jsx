import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Download, ExternalLink, FileText, Plus, Search, Trash2, X } from 'lucide-react';

import { useLoad } from '../../../hooks/useLoad.js';
import { adminService } from '../../../services/adminService.js';
import { api } from '../../../../../services/api.js';

const DOCUMENT_CATEGORIES = ['ID Proof', 'Address Proof', 'Certificates', 'Contracts', 'Other Documents'];

function formatDate(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fileType(doc = {}) {
  if (doc.mimeType?.includes('pdf')) return 'PDF';
  if (doc.mimeType?.startsWith('image/')) return 'Image';
  if (doc.mimeType?.startsWith('video/')) return 'Video';
  return doc.mimeType || '-';
}

export default function EmployeeDocuments() {
  const { id } = useParams();
  const { data, loading: employeeLoading } = useLoad(adminService.employees, []);
  const employee = useMemo(() => (data?.data || []).find((row) => row._id === id), [data, id]);
  const [docs, setDocs] = useState([]);
  const [query, setQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [loadingDocs, setLoadingDocs] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const loadDocuments = useCallback(async () => {
    setLoadingDocs(true);
    setError('');
    try {
      const result = await api.hrListDocuments({ empId: id, limit: 100 });
      setDocs(Array.isArray(result.data) ? result.data : []);
    } catch (err) {
      setError(err.message || 'Unable to load documents');
      setDocs([]);
    } finally {
      setLoadingDocs(false);
    }
  }, [id]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const filtered = docs.filter((doc) => !query || [doc.name, doc.category, doc.uploadedBy, doc.size]
    .some((value) => String(value || '').toLowerCase().includes(query.toLowerCase())));
  const counts = {
    total: docs.length,
    idProof: docs.filter((doc) => doc.category === 'ID Proof').length,
    certificates: docs.filter((doc) => doc.category === 'Certificates').length,
    contracts: docs.filter((doc) => doc.category === 'Contracts').length,
  };

  async function addDocument(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const file = form.get('file');
    if (!file || !file.name) {
      setError('Please choose a document file.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      form.set('employee', employee?.name || '');
      form.set('empId', id);
      await api.hrUploadDocument(form);
      setUploadOpen(false);
      await loadDocuments();
    } catch (err) {
      setError(err.message || 'Document upload failed');
    } finally {
      setSaving(false);
    }
  }

  async function deleteDocument(doc) {
    if (!window.confirm(`Delete "${doc.name}"?`)) return;
    try {
      await api.hrDeleteDocument(doc._id);
      await loadDocuments();
    } catch (err) {
      setError(err.message || 'Unable to delete document');
    }
  }

  if (employeeLoading) return <div className="hr-screen"><section className="hr-card">Loading documents...</section></div>;

  return (
    <div className="hr-screen">
      <div className="hr-breadcrumb"><Link to="/employee-management/employees">Employees</Link><span>/</span><Link to={`/employee-management/employees/${id}`}>Employee Profile</Link><span>/</span><strong>Documents</strong></div>
      <div className="hr-page-head">
        <div><h1>Employee Documents</h1><p>Upload and manage real employee files</p></div>
        <div className="hr-actions"><button className="hr-btn primary" type="button" onClick={() => setUploadOpen(true)}><Plus size={15} /> Upload Document</button></div>
      </div>

      {error && <div className="hr-alert error">{error}</div>}

      <section className="hr-doc-person">
        <div className="hr-avatar-sm">{employee?.name?.[0] || 'E'}</div>
        <div><strong>{employee?.name || 'Employee'}</strong><span>{employee?.employeeId || '-'} · {employee?.designation || '-'}</span></div>
        <div className="hr-doc-stats">{[['Total Documents', counts.total], ['ID Proof', counts.idProof], ['Certificates', counts.certificates], ['Contracts', counts.contracts]].map(([k, v]) => <span key={k}><b>{v}</b>{k}</span>)}</div>
      </section>

      <section className="hr-card">
        <div className="hr-toolbar"><div className="hr-search"><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents..." /></div></div>
        <div className="hr-table-wrap">
          <table className="hr-table">
            <thead><tr><th>Document</th><th>Category</th><th>File Type</th><th>Size</th><th>Uploaded On</th><th>Uploaded By</th><th>Actions</th></tr></thead>
            <tbody>
              {loadingDocs && <tr><td colSpan={7}>Loading documents...</td></tr>}
              {!loadingDocs && filtered.length === 0 && <tr><td colSpan={7}>No employee documents uploaded yet.</td></tr>}
              {!loadingDocs && filtered.map((doc) => (
                <tr key={doc._id}>
                  <td><FileText size={15} /> {doc.name}</td>
                  <td>{doc.category || '-'}</td>
                  <td>{fileType(doc)}</td>
                  <td>{doc.size || '-'}</td>
                  <td>{formatDate(doc.createdAt || doc.uploadedOn)}</td>
                  <td>{doc.uploadedBy || '-'}</td>
                  <td>
                    <div className="hr-row-actions">
                      <button className="hr-icon-btn" type="button" title="View" onClick={() => window.open(api.hrDocViewUrl(doc._id), '_blank', 'noopener')}><ExternalLink size={15} /></button>
                      <button className="hr-icon-btn" type="button" title="Download" onClick={() => window.open(api.hrDocDownloadUrl(doc._id), '_blank', 'noopener')}><Download size={15} /></button>
                      <button className="hr-icon-btn danger" type="button" title="Delete" onClick={() => deleteDocument(doc)}><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {uploadOpen && (
        <div className="employee-modal-backdrop">
          <form className="employee-modal employee-confirm-modal" onSubmit={addDocument}>
            <div className="employee-modal-head"><h2>Upload Document</h2><button className="icon-btn" type="button" onClick={() => setUploadOpen(false)}><X size={17} /></button></div>
            <div className="field"><label>Document Name</label><input name="name" placeholder="Aadhaar, offer letter, certificate..." required /></div>
            <div className="field"><label>Category</label><select name="category" defaultValue="ID Proof">{DOCUMENT_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}</select></div>
            <div className="field"><label>Upload File</label><input name="file" type="file" accept=".pdf,image/*,video/mp4,video/webm,video/quicktime,.mkv" required /></div>
            <div className="field"><label>Uploaded By</label><input name="uploadedBy" defaultValue="Super Admin" /></div>
            <div className="employee-modal-actions"><button className="btn" type="button" onClick={() => setUploadOpen(false)}>Cancel</button><button className="btn primary" disabled={saving}>{saving ? 'Uploading...' : 'Upload Document'}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

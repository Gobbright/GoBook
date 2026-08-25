import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FileCheck2, FileText, MoreVertical, Plus, Search, X } from 'lucide-react';

import { useLoad } from '../../../hooks/useLoad.js';
import { adminService } from '../../../services/adminService.js';

const DEFAULT_DOCS = [
  ['Aadhaar / ID Proof', 'Identity', 'Verified'],
  ['PAN Card', 'Tax', 'Verified'],
  ['Joining Letter', 'Employment', 'Verified'],
  ['Experience Certificate', 'Experience', 'Pending'],
  ['Education Certificate', 'Education', 'Verified'],
  ['Bank Document', 'Bank', 'Verified'],
  ['Medical Certificate', 'Medical', 'Rejected'],
  ['Offer Letter', 'Employment', 'Verified'],
];

function statusClass(status) {
  if (status === 'Verified') return 'hr-pill green';
  if (status === 'Pending') return 'hr-pill amber';
  return 'hr-pill red';
}

export default function EmployeeDocuments() {
  const { id } = useParams();
  const { data, loading } = useLoad(adminService.employees, []);
  const employee = useMemo(() => (data?.data || []).find((row) => row._id === id), [data, id]);
  const [docs, setDocs] = useState(() => DEFAULT_DOCS.map(([name, type, status], index) => ({ id: index + 1, name, type, status, issueDate: '12 Jan 2025', expiryDate: index === 6 ? '05 Aug 2027' : '-', uploadedOn: '12 Jan 2025' })));
  const [selected, setSelected] = useState(null);
  const [query, setQuery] = useState('');
  const [uploadOpen, setUploadOpen] = useState(false);
  const filtered = docs.filter((doc) => !query || [doc.name, doc.type, doc.status].some((value) => value.toLowerCase().includes(query.toLowerCase())));
  const counts = { total: docs.length, verified: docs.filter((d) => d.status === 'Verified').length, pending: docs.filter((d) => d.status === 'Pending').length, rejected: docs.filter((d) => d.status === 'Rejected').length };

  function addDocument(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setDocs((current) => [{ id: crypto.randomUUID(), name: form.get('name'), type: form.get('type'), status: 'Pending', issueDate: new Date().toLocaleDateString('en-IN'), expiryDate: '-', uploadedOn: new Date().toLocaleDateString('en-IN') }, ...current]);
    setUploadOpen(false);
  }

  function setStatus(status) {
    setDocs((current) => current.map((doc) => doc.id === selected?.id ? { ...doc, status } : doc));
    setSelected((current) => current ? { ...current, status } : current);
  }

  if (loading) return <div className="hr-screen"><section className="hr-card">Loading documents...</section></div>;

  return (
    <div className="hr-screen">
      <div className="hr-breadcrumb"><Link to="/employee-management/employees">Employees</Link><span>/</span><Link to={`/employee-management/employees/${id}`}>Employee Profile</Link><span>/</span><strong>Documents</strong></div>
      <div className="hr-page-head">
        <div><h1>Employee Documents</h1><p>Manage employee documents and verification</p></div>
        <div className="hr-actions"><button className="hr-btn primary" type="button" onClick={() => setUploadOpen(true)}><Plus size={15} /> Upload Document</button><button className="hr-icon-btn"><MoreVertical size={16} /></button></div>
      </div>
      <section className="hr-doc-person"><div className="hr-avatar-sm">{employee?.name?.[0] || 'E'}</div><div><strong>{employee?.name || 'Employee'}</strong><span>{employee?.employeeId || '-'} · {employee?.designation || '-'}</span></div><div className="hr-doc-stats">{[['Total Documents', counts.total], ['Verified', counts.verified], ['Pending', counts.pending], ['Rejected', counts.rejected]].map(([k, v]) => <span key={k}><b>{v}</b>{k}</span>)}</div></section>
      <section className="hr-card">
        <div className="hr-toolbar"><div className="hr-search"><Search size={15} /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search documents..." /></div></div>
        <div className="hr-table-wrap"><table className="hr-table"><thead><tr><th>Document</th><th>Type</th><th>Status</th><th>Issue Date</th><th>Expiry Date</th><th>Uploaded On</th><th>Actions</th></tr></thead><tbody>{filtered.map((doc) => <tr key={doc.id}><td><FileText size={15} /> {doc.name}</td><td>{doc.type}</td><td><span className={statusClass(doc.status)}>{doc.status}</span></td><td>{doc.issueDate}</td><td>{doc.expiryDate}</td><td>{doc.uploadedOn}</td><td><button className="hr-icon-btn" type="button" onClick={() => setSelected(doc)}><MoreVertical size={15} /></button></td></tr>)}</tbody></table></div>
      </section>
      {selected && <aside className="hr-verify-panel"><div className="hr-panel-head"><h2>Document Verification</h2><button type="button" onClick={() => setSelected(null)}><X size={17} /></button></div><h3>{selected.name}</h3><p>{employee?.name || 'Employee'} · {employee?.employeeId || '-'}</p><div className="hr-doc-preview"><FileCheck2 size={58} /><span>Document Preview</span></div><div className="hr-check-list"><strong>Verification Status</strong>{['Pending', 'Verified', 'Rejected'].map((status) => <label key={status}><input type="radio" checked={selected.status === status} onChange={() => setStatus(status)} />{status}</label>)}</div><textarea placeholder="Enter verification notes..." /><div className="hr-panel-actions"><button className="hr-btn" onClick={() => setSelected(null)}>Cancel</button><button className="hr-btn primary" onClick={() => setSelected(null)}>Verify</button></div></aside>}
      {uploadOpen && <div className="employee-modal-backdrop"><form className="employee-modal employee-confirm-modal" onSubmit={addDocument}><div className="employee-modal-head"><h2>Upload Document</h2><button className="icon-btn" type="button" onClick={() => setUploadOpen(false)}><X size={17} /></button></div><div className="field"><label>Document Name</label><input name="name" required /></div><div className="field"><label>Type</label><input name="type" required /></div><div className="employee-modal-actions"><button className="btn" type="button" onClick={() => setUploadOpen(false)}>Cancel</button><button className="btn primary">Upload</button></div></form></div>}
    </div>
  );
}

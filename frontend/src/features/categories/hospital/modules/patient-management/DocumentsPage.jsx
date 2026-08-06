import { useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Download, Eye, FileText, MoreHorizontal, Search, Upload, X } from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';
import { fmtDate } from '../../../shared/recordUi/dateUtils.js';

const DOCUMENT_TYPES = [
  'Lab Reports',
  'Radiology Reports',
  'Prescriptions',
  'Discharge Summaries',
  'Insurance Documents',
  'Identity Documents',
  'Referral Letters',
  'Consent Forms',
  'Other',
];

const EMPTY_FORM = {
  patientName: '',
  patientId: '',
  documentType: 'Lab Reports',
  name: '',
  date: '',
  relatedVisit: '',
  fileName: '',
  status: 'Stored',
};

const INPUT = 'h-9 w-full rounded-md border border-[#dbe4ef] bg-white px-3 text-[13px] font-[inherit] outline-none focus:border-blue-500';
const LABEL = 'mb-1 block text-[12px] font-semibold text-[#374151]';

function phoneOf(data = {}) {
  return data.phone || data.mobile || '';
}

function patientLabel(record) {
  const data = record?.data || {};
  return [data.name, data.patientId].filter(Boolean).join(' - ') || 'Select patient';
}

function normalizeDate(value) {
  if (!value) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const match = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return match ? `${match[3]}-${match[2]}-${match[1]}` : value;
}

function ActionButton({ children, onClick, tone = 'white' }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white',
    white: 'border-[#dbe4ef] bg-white text-[#374151]',
  };
  return (
    <button type="button" onClick={onClick} className={`inline-flex h-8 items-center justify-center gap-1.5 rounded-md border px-2.5 text-[12.5px] font-semibold cursor-pointer ${tones[tone]}`}>
      {children}
    </button>
  );
}

function DocumentMenu({ document, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-[#dbe4ef] bg-white text-[#374151] cursor-pointer" aria-label="Document actions">
        <MoreHorizontal size={16} />
      </button>
      {open && (
        <div className="absolute right-0 top-9 z-20 w-36 overflow-hidden rounded-md border border-[#dfe7f1] bg-white shadow-lg">
          <button type="button" onClick={() => { setOpen(false); onEdit(document); }} className="block w-full border-0 bg-white px-3 py-2 text-left text-[12.5px] text-[#374151] cursor-pointer hover:bg-blue-50">Edit</button>
          <button type="button" onClick={() => { setOpen(false); onDelete(document); }} className="block w-full border-0 bg-white px-3 py-2 text-left text-[12.5px] text-red-600 cursor-pointer hover:bg-red-50">Delete</button>
        </div>
      )}
    </div>
  );
}

function UploadModal({ initial, patients, onClose, onSubmit }) {
  const [form, setForm] = useState({ ...EMPTY_FORM, ...initial });

  function set(field, value) {
    setForm((current) => {
      const next = { ...current, [field]: value };
      if (field === 'patientName') {
        const patient = patients.find((record) => record.data?.name === value);
        next.patientId = patient?.data?.patientId || '';
      }
      return next;
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-2xl rounded-xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-[#edf2f7] px-4 py-3">
          <h2 className="m-0 text-[18px] font-extrabold text-[#111827]">Upload Document</h2>
          <button type="button" onClick={onClose} className="rounded-md border-0 bg-transparent p-1 text-[#64748b] cursor-pointer"><X size={18} /></button>
        </div>
        <div className="grid grid-cols-1 gap-3 p-4 md:grid-cols-2">
          <label>
            <span className={LABEL}>Patient *</span>
            <select className={INPUT} value={form.patientName} onChange={(event) => set('patientName', event.target.value)}>
              <option value="">Select patient</option>
              {patients.map((patient) => <option key={patient._id} value={patient.data?.name}>{patientLabel(patient)}</option>)}
            </select>
          </label>
          <label>
            <span className={LABEL}>Document Type *</span>
            <select className={INPUT} value={form.documentType} onChange={(event) => set('documentType', event.target.value)}>
              {DOCUMENT_TYPES.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <label>
            <span className={LABEL}>Document Name *</span>
            <input className={INPUT} value={form.name} onChange={(event) => set('name', event.target.value)} />
          </label>
          <label>
            <span className={LABEL}>Document Date</span>
            <input className={INPUT} type="date" value={normalizeDate(form.date)} onChange={(event) => set('date', event.target.value)} />
          </label>
          <label>
            <span className={LABEL}>Related Visit</span>
            <input className={INPUT} value={form.relatedVisit} onChange={(event) => set('relatedVisit', event.target.value)} placeholder="OPD-2026-00456" />
          </label>
          <div>
            <span className={LABEL}>File</span>
            <label className="flex h-24 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-[#b8c7da] bg-[#f8fafc] text-center text-[13px] font-semibold text-[#0f4c81] hover:bg-blue-50">
              <Upload size={18} />
              <span className="mt-1">{form.fileName || 'Drag & Drop'}</span>
              <span className="text-[11px] font-medium text-[#64748b]">PDF / JPG / PNG</span>
              <input type="file" className="hidden" onChange={(event) => set('fileName', event.target.files?.[0]?.name || '')} />
            </label>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[#edf2f7] px-4 py-3">
          <ActionButton onClick={onClose}>Cancel</ActionButton>
          <ActionButton tone="blue" onClick={() => onSubmit({ ...form, date: normalizeDate(form.date) })}>Upload</ActionButton>
        </div>
      </div>
    </div>
  );
}

export function DocumentsPage() {
  const location = useLocation();
  const patients = useModuleRecords('hospital/patients');
  const documents = useModuleRecords('hospital/patient-documents');
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('Medical Reports');
  const [dateFilter, setDateFilter] = useState('Date');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);

  const selectedPatient = useMemo(() => {
    if (selectedPatientId) return patients.records.find((record) => record._id === selectedPatientId) || null;
    const fromState = location.state?.patientName;
    return patients.records.find((record) => record.data?.name === fromState) || patients.records[0] || null;
  }, [patients.records, selectedPatientId, location.state]);

  const patientDocuments = useMemo(() => {
    const selectedName = selectedPatient?.data?.name || '';
    const q = search.trim().toLowerCase();
    const today = new Date().toDateString();
    return documents.records.filter((record) => {
      const data = record.data || {};
      const type = data.documentType || data.documentCategory || 'Other';
      const matchesPatient = !selectedName || data.patientName === selectedName;
      const matchesType = typeFilter === 'All' || type === typeFilter;
      const matchesCategory = categoryFilter === 'Medical Reports' || type === categoryFilter;
      const matchesDate = dateFilter === 'Date' || (data.date && new Date(data.date).toDateString() === today);
      const matchesSearch = !q || [data.name, type, data.relatedVisit, data.fileName].filter(Boolean).join(' ').toLowerCase().includes(q);
      return matchesPatient && matchesType && matchesCategory && matchesDate && matchesSearch;
    }).sort((a, b) => String(b.data?.date || b.createdAt || '').localeCompare(String(a.data?.date || a.createdAt || '')));
  }, [documents.records, selectedPatient, typeFilter, categoryFilter, dateFilter, search]);

  async function submit(form) {
    if (!form.patientName || !form.name || !form.documentType) return;
    if (modal.mode === 'edit') await documents.update(modal.record._id, form);
    else await documents.create(form);
    setModal(null);
  }

  async function deleteDocument(document) {
    if (!window.confirm(`Delete ${document.data?.name || 'this document'}?`)) return;
    await documents.remove(document._id);
  }

  function viewDocument(document) {
    window.alert(`${document.data?.name || 'Document'}\n${document.data?.fileName || 'No file attached'}`);
  }

  function downloadDocument(document) {
    const blob = new Blob([JSON.stringify(document.data || {}, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = window.document.createElement('a');
    link.href = url;
    link.download = `${document.data?.name || 'document'}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-3 md:p-4">
      {modal && (
        <UploadModal
          initial={modal.mode === 'edit' ? modal.record.data : { patientName: selectedPatient?.data?.name || '', patientId: selectedPatient?.data?.patientId || '' }}
          patients={patients.records}
          onClose={() => setModal(null)}
          onSubmit={submit}
        />
      )}

      <div className="rounded-2xl border border-[#e5e7eb] bg-[#f7f7f8] p-5 md:p-6">
        <div className="mb-7">
          <h1 className="m-0 text-[15px] font-extrabold text-[#111827]">Documents</h1>
        </div>

        <div className="mb-7 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto] md:items-center">
          <div className="flex flex-col gap-2">
            <div className="text-[14px] font-semibold text-[#111827]">
              Patient: {selectedPatient ? `${selectedPatient.data?.name || 'Unnamed'} - ${selectedPatient.data?.patientId || '-'}` : 'Select patient'}
            </div>
            <select className="h-8 max-w-sm rounded-md border border-[#dbe4ef] bg-white px-2.5 text-[12.5px] font-[inherit] outline-none focus:border-blue-500" value={selectedPatient?._id || ''} onChange={(event) => setSelectedPatientId(event.target.value)}>
              {patients.records.map((patient) => <option key={patient._id} value={patient._id}>{patientLabel(patient)} {phoneOf(patient.data) ? `| ${phoneOf(patient.data)}` : ''}</option>)}
            </select>
          </div>
        </div>

        <div className="mb-8 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-wrap gap-2">
            <select className="h-8 rounded-md border border-[#dbe4ef] bg-white px-2.5 text-[12.5px] font-[inherit] outline-none focus:border-blue-500" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value)}>
              {['All', ...DOCUMENT_TYPES].map((type) => <option key={type}>{type}</option>)}
            </select>
            <select className="h-8 rounded-md border border-[#dbe4ef] bg-white px-2.5 text-[12.5px] font-[inherit] outline-none focus:border-blue-500" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
              {['Medical Reports', ...DOCUMENT_TYPES].map((type) => <option key={type}>{type}</option>)}
            </select>
            <select className="h-8 rounded-md border border-[#dbe4ef] bg-white px-2.5 text-[12.5px] font-[inherit] outline-none focus:border-blue-500" value={dateFilter} onChange={(event) => setDateFilter(event.target.value)}>
              {['Date', 'Today'].map((type) => <option key={type}>{type}</option>)}
            </select>
          </div>
          <div className="relative w-full max-w-sm">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
            <input className="h-8 w-full rounded-md border border-[#dbe4ef] bg-white pl-8 pr-3 text-[12.5px] font-[inherit] outline-none focus:border-blue-500" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search" />
          </div>
        </div>

        <div className="mb-8 flex justify-center">
          <button type="button" onClick={() => setModal({ mode: 'add' })} className="inline-flex h-8 items-center gap-2 rounded-md border border-transparent bg-transparent px-3 text-[13px] font-semibold text-[#111827] cursor-pointer hover:bg-white">
            <Upload size={14} />Upload Document
          </button>
        </div>

        <div className="mb-6 h-px max-w-xl bg-[#111827]" />

        <div>
          {documents.loading ? (
            <div className="py-10 text-center text-[13px] text-[#536173]">Loading documents...</div>
          ) : patientDocuments.length === 0 ? (
            <div className="py-10 text-center text-[13px] text-[#536173]">No documents found.</div>
          ) : (
            <div className="flex flex-col gap-6">
              {patientDocuments.map((document) => {
                const data = document.data || {};
                return (
                  <div key={document._id} className="grid grid-cols-1 gap-2 md:grid-cols-[1fr_auto] md:items-end">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="mt-0.5 flex h-6 w-6 flex-none items-center justify-center text-[#64748b]"><FileText size={16} /></span>
                      <div className="min-w-0">
                        <div className="truncate text-[14px] font-semibold text-[#111827]">{data.name || 'Untitled Document'}</div>
                        <div className="mt-1 text-[13px] text-[#111827]">{data.documentType || 'Other'}</div>
                        <div className="mt-1 text-[13px] text-[#111827]">{fmtDate(data.date || document.createdAt)}</div>
                      </div>
                    </div>
                    <div className="ml-9 flex flex-wrap items-center gap-2 md:ml-0">
                      <ActionButton onClick={() => viewDocument(document)}><Eye size={13} />View</ActionButton>
                      <ActionButton onClick={() => downloadDocument(document)}><Download size={13} />Download</ActionButton>
                      <DocumentMenu document={document} onEdit={(record) => setModal({ mode: 'edit', record })} onDelete={deleteDocument} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

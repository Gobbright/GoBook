import { useMemo, useState } from 'react';
import { Eye, Package, Plus, Search, Trash2, X } from 'lucide-react';

import { useModuleRecords } from '../../../shared/recordUi/useModuleRecords.js';

const CATEGORIES = ['Health Checkup', 'Maternity', 'Surgery', 'Cardiac Checkup', 'Diabetes Checkup', 'Executive Health Check', 'IPD Treatment'];
const EMPTY_SERVICE = { name: '', price: 0 };
const SAMPLE_SERVICES = [
  { name: 'CBC', price: 800 },
  { name: 'Blood Sugar', price: 300 },
  { name: 'ECG', price: 600 },
  { name: 'Chest X-Ray', price: 1200 },
  { name: 'Doctor Consultation', price: 500 },
];
const INPUT = 'border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] text-[#111827] outline-none focus:border-blue-500 font-[inherit] bg-white';

function money(value) {
  return `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function endOfYear() {
  return `${new Date().getFullYear()}-12-31`;
}

function totalServices(services = []) {
  return services.reduce((sum, service) => sum + Number(service.price || 0), 0);
}

function Button({ children, onClick, tone = 'white', disabled = false }) {
  const tones = {
    blue: 'border-blue-600 bg-blue-600 text-white hover:bg-blue-700',
    green: 'border-emerald-600 bg-emerald-600 text-white hover:bg-emerald-700',
    red: 'border-red-100 bg-red-50 text-red-700 hover:bg-red-100',
    white: 'border-[#dbe4ef] bg-white text-[#374151] hover:bg-gray-50',
  };
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-md border px-3 text-[13px] font-semibold cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 ${tones[tone]}`}>
      {children}
    </button>
  );
}

function emptyForm() {
  return {
    packageName: 'Master Health Checkup',
    category: 'Health Checkup',
    services: SAMPLE_SERVICES,
    packagePrice: 2499,
    validFrom: today(),
    validTo: endOfYear(),
    status: 'Active',
  };
}

function PackageForm({ initial, onClose, onSave }) {
  const [form, setForm] = useState(() => initial || emptyForm());
  const regularTotal = totalServices(form.services);

  function set(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  function updateService(index, field, value) {
    setForm((current) => ({
      ...current,
      services: current.services.map((service, itemIndex) => itemIndex === index ? { ...service, [field]: field === 'price' ? Number(value) : value } : service),
    }));
  }

  function addService() {
    setForm((current) => ({ ...current, services: [...current.services, { ...EMPTY_SERVICE }] }));
  }

  function removeService(index) {
    setForm((current) => ({ ...current, services: current.services.filter((_, itemIndex) => itemIndex !== index) }));
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[#f7f7f8] p-5 shadow-2xl">
        <div className="mb-5 flex items-center justify-between">
          <h2 className="m-0 text-[18px] font-extrabold text-[#111827]">{initial ? 'Edit Package' : 'Create Package'}</h2>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#dbe4ef] bg-white text-[#334155] cursor-pointer"><X size={16} /></button>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="md:col-span-2"><span className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Package Name *</span><input className={`${INPUT} w-full`} value={form.packageName} onChange={(event) => set('packageName', event.target.value)} /></label>
          <label><span className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Category</span><select className={`${INPUT} w-full`} value={form.category} onChange={(event) => set('category', event.target.value)}>{CATEGORIES.map((item) => <option key={item}>{item}</option>)}</select></label>
          <label><span className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Status</span><select className={`${INPUT} w-full`} value={form.status} onChange={(event) => set('status', event.target.value)}><option>Active</option><option>Inactive</option></select></label>
        </div>

        <div className="my-6 h-px max-w-md bg-[#111827]" />
        <div className="mb-4 text-[13px] font-extrabold uppercase text-[#111827]">Included Services</div>

        <div className="mb-4 grid gap-2">
          {form.services.map((service, index) => (
            <div key={`${service.name}-${index}`} className="grid gap-2 md:grid-cols-[minmax(0,1fr)_140px_36px]">
              <input className={`${INPUT} w-full`} value={service.name} onChange={(event) => updateService(index, 'name', event.target.value)} placeholder="Service name" />
              <input className={`${INPUT} w-full text-right`} type="number" value={service.price} onChange={(event) => updateService(index, 'price', event.target.value)} placeholder="Price" />
              <button type="button" onClick={() => removeService(index)} className="inline-flex h-10 w-9 items-center justify-center rounded-md border border-red-100 bg-red-50 text-red-600 cursor-pointer"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <Button onClick={addService}><Plus size={14} />Add Service</Button>

        <div className="my-6 h-px max-w-md bg-[#111827]" />

        <div className="grid gap-4 md:grid-cols-2">
          <div className="text-[13px] font-semibold"><span>Regular Total</span><strong className="ml-6">{money(regularTotal)}</strong></div>
          <label><span className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Package Price</span><input className={`${INPUT} w-full`} type="number" value={form.packagePrice} onChange={(event) => set('packagePrice', Number(event.target.value))} /></label>
          <label><span className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Valid From</span><input className={`${INPUT} w-full`} type="date" value={form.validFrom} onChange={(event) => set('validFrom', event.target.value)} /></label>
          <label><span className="mb-1 block text-[12px] font-extrabold uppercase text-[#536173]">Valid To</span><input className={`${INPUT} w-full`} type="date" value={form.validTo} onChange={(event) => set('validTo', event.target.value)} /></label>
        </div>

        <div className="mt-6 flex justify-end">
          <Button tone="green" disabled={!form.packageName.trim() || form.services.length === 0} onClick={() => onSave({ ...form, regularTotal })}>Save Package</Button>
        </div>
      </div>
    </div>
  );
}

function PackageDetails({ pkg, onClose, onEdit }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-900/50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="m-0 text-[16px] font-extrabold text-[#071936]">{pkg.packageName}</h2>
          <button type="button" onClick={onClose} className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-[#dbe4ef] bg-white text-[#334155] cursor-pointer"><X size={16} /></button>
        </div>
        <div className="mb-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-md bg-[#f8fbff] p-3 text-[13px]"><div className="text-[#64748b]">Category</div><strong>{pkg.category}</strong></div>
          <div className="rounded-md bg-[#f8fbff] p-3 text-[13px]"><div className="text-[#64748b]">Regular</div><strong>{money(pkg.regularTotal)}</strong></div>
          <div className="rounded-md bg-[#f8fbff] p-3 text-[13px]"><div className="text-[#64748b]">Package</div><strong>{money(pkg.packagePrice)}</strong></div>
        </div>
        <div className="rounded-md border border-[#dfe7f1]">
          {(pkg.services || []).map((service, index) => (
            <div key={`${service.name}-${index}`} className="flex justify-between border-b border-[#edf2f7] px-3 py-2 text-[13px] last:border-0"><span>{service.name}</span><strong>{money(service.price)}</strong></div>
          ))}
        </div>
        <div className="mt-4 flex justify-end"><Button onClick={onEdit}>Edit</Button></div>
      </div>
    </div>
  );
}

export function PackagesPage() {
  const packages = useModuleRecords('hospital/packages');
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [viewPackage, setViewPackage] = useState(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return packages.records
      .map((record) => ({ id: record._id, ...record.data }))
      .filter((pkg) => !q || [pkg.packageName, pkg.category, pkg.status].filter(Boolean).join(' ').toLowerCase().includes(q));
  }, [packages.records, search]);

  async function savePackage(form) {
    const payload = {
      ...form,
      name: form.packageName,
      regularTotal: Number(form.regularTotal || totalServices(form.services)),
      packagePrice: Number(form.packagePrice || 0),
      serviceCount: form.services.length,
    };
    if (modal?.mode === 'edit') await packages.update(modal.package.id, payload);
    else await packages.create(payload);
    setModal(null);
  }

  return (
    <div className="p-3 md:p-4">
      <div className="rounded-2xl border border-[#e5e7eb] bg-[#f7f7f8] p-5 md:p-6">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <h1 className="m-0 text-[18px] font-extrabold uppercase text-[#111827]">Packages</h1>
          <Button tone="blue" onClick={() => setModal({ mode: 'add' })}><Plus size={14} />Create Package</Button>
        </div>

        <div className="mb-7 max-w-xl">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748b]" />
            <input className={`${INPUT} w-full pl-8`} value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search Package" />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {packages.loading ? (
            <div className="text-[13px] text-[#64748b]">Loading packages...</div>
          ) : rows.length === 0 ? (
            <div className="rounded-md border border-[#dbe4ef] bg-white px-4 py-8 text-center text-[13px] text-[#64748b]">No packages found.</div>
          ) : rows.map((pkg) => (
            <div key={pkg.id} className="rounded-md border border-[#111827] bg-white p-4">
              <div className="mb-8 flex items-center justify-between gap-3">
                <div className="font-extrabold uppercase text-[#111827]">{pkg.packageName}</div>
                <span className={`rounded-md px-2 py-0.5 text-[11px] font-extrabold uppercase ${pkg.status === 'Active' ? 'bg-green-50 text-green-700' : 'bg-slate-100 text-slate-600'}`}>{pkg.status}</span>
              </div>
              <div className="mb-5 text-[13px] font-semibold text-[#111827]">{pkg.serviceCount || pkg.services?.length || 0} Services</div>
              <div className="grid gap-2 text-[13px]">
                <div className="flex justify-between"><span>Regular Price</span><strong>{money(pkg.regularTotal || totalServices(pkg.services))}</strong></div>
                <div className="flex justify-between"><span>Package Price</span><strong>{money(pkg.packagePrice)}</strong></div>
              </div>
              <div className="mt-7 flex justify-end gap-2">
                <Button onClick={() => setViewPackage(pkg)}><Eye size={13} />View</Button>
                <Button onClick={() => setModal({ mode: 'edit', package: pkg })}>Edit</Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {modal && <PackageForm initial={modal.mode === 'edit' ? modal.package : null} onClose={() => setModal(null)} onSave={savePackage} />}
      {viewPackage && (
        <PackageDetails
          pkg={viewPackage}
          onClose={() => setViewPackage(null)}
          onEdit={() => {
            setModal({ mode: 'edit', package: viewPackage });
            setViewPackage(null);
          }}
        />
      )}
    </div>
  );
}

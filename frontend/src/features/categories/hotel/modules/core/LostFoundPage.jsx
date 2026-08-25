import { useMemo, useState } from 'react';
import { Phone } from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { AddIcon, HkBadge, HkCard, HkPageHeader, HkPrimaryButton, HkSearch, HkTableActions, lostFoundItems } from './HousekeepingShared.jsx';
import { paginateRows, PaginationFooter } from './HotelPagination.jsx';

export function LostFoundPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [items, setItems] = useState(lostFoundItems);
  const [selected, setSelected] = useState(lostFoundItems[0] || null);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ item: '', category: 'Electronics', room: '', foundDate: '10 Aug 2026', foundTime: '11:20 AM', foundBy: '', brand: '', color: '', condition: 'Good', description: '', storage: '', guest: '' });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const matchesSearch = !query || [item.id, item.item, item.room, item.guest].some((value) => value.toLowerCase().includes(query));
      const matchesStatus = status === 'All' || item.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [items, search, status]);

  const pagination = paginateRows(filtered, page, pageSize);

  function addItem() {
    const next = {
      id: `LF-${1026 + items.length}`,
      item: form.item,
      category: form.category,
      room: form.room,
      guest: form.guest || 'Unknown',
      foundDate: form.foundDate,
      foundTime: form.foundTime,
      foundBy: form.foundBy || '-',
      brand: form.brand,
      color: form.color,
      condition: form.condition,
      description: form.description,
      status: 'Stored',
      storage: form.storage || 'Lost & Found Locker',
    };
    setItems((current) => [next, ...current]);
    setSelected(next);
    setForm({ item: '', category: 'Electronics', room: '', foundDate: '10 Aug 2026', foundTime: '11:20 AM', foundBy: '', brand: '', color: '', condition: 'Good', description: '', storage: '', guest: '' });
    setShowForm(false);
    setMessage(`${next.id} stored in ${next.storage}.`);
  }

  function handleItemAction(action, item) {
    if (!item) return;
    if (action === 'View') {
      setSelected(item);
      setMessage(`${item.id} selected.`);
      return;
    }
    if (action === 'Edit') {
      setSelected(item);
      setForm({
        item: item.item || '',
        category: item.category || 'Electronics',
        room: item.room || '',
        foundDate: item.foundDate || '',
        foundTime: item.foundTime || '',
        foundBy: item.foundBy === '-' ? '' : item.foundBy || '',
        brand: item.brand || '',
        color: item.color || '',
        condition: item.condition || 'Good',
        description: item.description || '',
        storage: item.storage || '',
        guest: item.guest || '',
      });
      setShowForm(true);
      setMessage(`Editing ${item.id}.`);
      return;
    }
    if (action === 'Delete') {
      setItems((current) => current.filter((entry) => entry.id !== item.id));
      setSelected((current) => (current?.id === item.id ? null : current));
      setMessage(`${item.id} removed from Lost & Found.`);
    }
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <HkPageHeader
        title="Lost & Found"
        subtitle="Record, store, identify, return, and audit guest belongings"
        actions={<HkPrimaryButton onClick={() => setShowForm((value) => !value)}><AddIcon />Add Item</HkPrimaryButton>}
      />

      {message && <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] font-semibold text-blue-700">{message}</div>}

      {showForm && (
        <form onSubmit={(event) => { event.preventDefault(); if (form.item && form.room) addItem(); }} className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-[14px] font-bold text-slate-950">Add Lost & Found Item</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input value={form.item} onChange={(event) => setForm((current) => ({ ...current, item: event.target.value }))} placeholder="Item name *" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <SelectDropdown value={form.category} onChange={(category) => setForm((current) => ({ ...current, category }))} options={['Electronics', 'Wallet/Purse', 'Jewellery', 'Clothing', 'Documents', 'Keys', 'Accessories', 'Other']} />
            <input value={form.room} onChange={(event) => setForm((current) => ({ ...current, room: event.target.value }))} placeholder="Found in room *" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <input value={form.foundDate} onChange={(event) => setForm((current) => ({ ...current, foundDate: event.target.value }))} placeholder="Found date" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <input value={form.foundTime} onChange={(event) => setForm((current) => ({ ...current, foundTime: event.target.value }))} placeholder="Found time" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <input value={form.foundBy} onChange={(event) => setForm((current) => ({ ...current, foundBy: event.target.value }))} placeholder="Found by" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <input value={form.guest} onChange={(event) => setForm((current) => ({ ...current, guest: event.target.value }))} placeholder="Linked guest" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <input value={form.brand} onChange={(event) => setForm((current) => ({ ...current, brand: event.target.value }))} placeholder="Brand" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <input value={form.color} onChange={(event) => setForm((current) => ({ ...current, color: event.target.value }))} placeholder="Color" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <SelectDropdown value={form.condition} onChange={(condition) => setForm((current) => ({ ...current, condition }))} options={['Good', 'Damaged', 'New', 'Used']} />
            <input value={form.storage} onChange={(event) => setForm((current) => ({ ...current, storage: event.target.value }))} placeholder="Storage location" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500 md:col-span-2" />
            <input value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500 md:col-span-2" />
            <HkPrimaryButton type="submit">Save Item</HkPrimaryButton>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        <HkCard>
          <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 lg:grid-cols-[1fr_180px]">
            <HkSearch value={search} onChange={setSearch} placeholder="Item / Room / Guest" />
            <SelectDropdown value={status} onChange={setStatus} options={['All', 'Stored', 'Returned', 'Claimed', 'Disposed']} />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 text-left text-[11px] uppercase tracking-wide text-slate-500">
                  <th className="px-4 py-3 font-semibold">Item ID</th>
                  <th className="px-4 py-3 font-semibold">Item</th>
                  <th className="px-4 py-3 font-semibold">Room</th>
                  <th className="px-4 py-3 font-semibold">Found Date</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {pagination.pageRows.map((item) => (
                  <tr key={item.id} onClick={() => setSelected(item)} className={`cursor-pointer border-t border-slate-100 hover:bg-slate-50 ${selected?.id === item.id ? 'bg-blue-50/60' : ''}`}>
                    <td className="px-4 py-3 text-[13px] font-semibold text-slate-950">{item.id}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-700">{item.item}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-700">{item.room}</td>
                    <td className="px-4 py-3 text-[13px] text-slate-700">{item.foundDate}</td>
                    <td className="px-4 py-3"><HkBadge>{item.status}</HkBadge></td>
                    <td className="px-4 py-3"><HkTableActions destructive item={item} onAction={handleItemAction} /></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-[13px] text-slate-500">No lost and found items recorded.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <PaginationFooter page={pagination.currentPage} pageSize={pageSize} total={filtered.length} start={pagination.start} end={pagination.end} totalPages={pagination.totalPages} onPageChange={setPage} onPageSizeChange={setPageSize} />
        </HkCard>

        <HkCard className="p-4">
          {!selected ? (
            <p className="m-0 text-[13px] text-slate-500">Select or add an item to view details.</p>
          ) : (
            <>
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 className="m-0 text-[18px] font-bold text-slate-950">{selected.id}</h2>
              <p className="m-0 mt-1 text-[13px] font-semibold text-slate-500">{selected.item}</p>
            </div>
            <HkBadge>{selected.status}</HkBadge>
          </div>
          <div className="mt-4 flex h-32 items-center justify-center rounded-lg border border-dashed border-slate-300 bg-slate-50 text-[13px] font-semibold text-slate-500">Item Photo</div>
          <div className="mt-5 space-y-3 text-[13px]">
            <div className="flex justify-between gap-3"><span className="text-slate-500">Found In</span><span className="font-bold text-slate-950">Room {selected.room}</span></div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">Found Date</span><span className="font-bold text-slate-950">{selected.foundDate}</span></div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">Found By</span><span className="font-bold text-slate-950">{selected.foundBy}</span></div>
            <div className="flex justify-between gap-3"><span className="text-slate-500">Stored At</span><span className="font-bold text-slate-950">{selected.storage}</span></div>
          </div>
          <div className="my-5 border-t border-slate-200" />
          <h3 className="m-0 text-[14px] font-bold text-slate-950">Guest Information</h3>
          <div className="mt-3 rounded-md bg-slate-50 p-3 text-[13px]">
            <div className="font-bold text-slate-950">{selected.guest}</div>
            <div className="mt-1 text-slate-500">Previous Room: {selected.room}</div>
          </div>
          <div className="mt-5 grid gap-2">
            <HkPrimaryButton><Phone size={14} />Contact Guest</HkPrimaryButton>
            <button type="button" className="rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] font-semibold text-blue-700">Mark as Claimed</button>
            <button type="button" className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] font-semibold text-emerald-700">Return Item</button>
            <button type="button" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[13px] font-semibold text-red-700">Dispose Item</button>
          </div>
            </>
          )}
        </HkCard>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { ChefHat, Coffee, Plus, UtensilsCrossed } from 'lucide-react';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { createModuleRecord, deleteModuleRecord, listModuleRecords } from '../../../../../services/moduleRecordsService.js';
import { paginateRows, PaginationFooter } from './HotelPagination.jsx';
import {
  menuItems,
  money,
  PosBadge,
  PosCard,
  PosPageHeader,
  PosPrimaryButton,
  PosSearch,
  PosStatCard,
  PosTableActions,
} from './RestaurantPosShared.jsx';

export function RestaurantMenuPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All Categories');
  const [type, setType] = useState('All Types');
  const [status, setStatus] = useState('All Status');
  const [items, setItems] = useState(menuItems);
  const [message, setMessage] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [form, setForm] = useState({
    name: '',
    code: '',
    category: 'Starters',
    subcategory: '',
    type: 'Veg',
    price: '',
    tax: 'GST 5%',
    channels: ['Dine In', 'Takeaway', 'Room Service'],
    availableFrom: '11:00 AM',
    availableUntil: '11:00 PM',
    description: '',
    status: 'Active',
  });

  useEffect(() => {
    let active = true;
    listModuleRecords('hotel/restaurant-pos/menu')
      .then((res) => {
        if (!active) return;
        setItems((res.records || []).map((record, index) => {
          const data = record.data || {};
          return {
            recordId: record._id,
            id: record._id || data.id || data.code || `MN-${index + 1}`,
            name: data.name || data.itemName || '',
            category: data.category || 'Starters',
            type: data.type || 'Veg',
            price: Number(data.price || data.rate || 0),
            status: data.status || 'Active',
            channels: Array.isArray(data.channels) ? data.channels : String(data.channels || 'Dine In, Takeaway, Room Service').split(',').map((item) => item.trim()).filter(Boolean),
            tax: data.tax || 'GST 5%',
            subcategory: data.subcategory || '',
            availableFrom: data.availableFrom || '11:00 AM',
            availableUntil: data.availableUntil || '11:00 PM',
            description: data.description || '',
            code: data.code || `FNB-${index + 1}`,
          };
        }).filter((item) => item.name));
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => { active = false; };
  }, []);

  const rows = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      const searchMatch = !query || [item.name, item.code].some((value) => value.toLowerCase().includes(query));
      const categoryMatch = category === 'All Categories' || item.category === category;
      const typeMatch = type === 'All Types' || item.type === type;
      const statusMatch = status === 'All Status' || item.status === status;
      return searchMatch && categoryMatch && typeMatch && statusMatch;
    });
  }, [category, items, search, status, type]);

  const pagination = paginateRows(rows, page, pageSize);

  async function addItem() {
    const next = {
      id: `MN-${String(items.length + 1).padStart(3, '0')}`,
      name: form.name,
      category: form.category,
      type: form.type,
      price: Number(form.price),
      status: form.status,
      channels: form.channels,
      tax: form.tax,
      subcategory: form.subcategory,
      availableFrom: form.availableFrom,
      availableUntil: form.availableUntil,
      description: form.description,
      code: form.code || `FNB-${String(items.length + 1).padStart(3, '0')}`,
    };
    try {
      const saved = await createModuleRecord('hotel/restaurant-pos/menu', next);
      setItems((current) => [{ ...next, recordId: saved._id, id: saved._id || next.id }, ...current]);
      setForm({ name: '', code: '', category: 'Starters', subcategory: '', type: 'Veg', price: '', tax: 'GST 5%', channels: ['Dine In', 'Takeaway', 'Room Service'], availableFrom: '11:00 AM', availableUntil: '11:00 PM', description: '', status: 'Active' });
      setShowForm(false);
      setMessage(`${next.name} added.`);
    } catch (err) {
      setMessage(err.message || 'Unable to save menu item.');
    }
  }

  async function handleItemAction(action, item) {
    if (!item) return;
    if (action === 'View') {
      setMessage(`${item.name}: ${money(item.price)} / ${item.status}`);
      return;
    }
    if (action === 'Edit') {
      setForm({
        name: item.name || '',
        code: item.code || '',
        category: item.category || 'Starters',
        subcategory: item.subcategory || '',
        type: item.type || 'Veg',
        price: String(item.price || ''),
        tax: item.tax || 'GST 5%',
        channels: item.channels || [],
        availableFrom: item.availableFrom || '11:00 AM',
        availableUntil: item.availableUntil || '11:00 PM',
        description: item.description || '',
        status: item.status || 'Active',
      });
      setShowForm(true);
      setMessage(`Editing ${item.name}.`);
      return;
    }
    if (action === 'Delete') {
      try {
        if (item.recordId) await deleteModuleRecord(item.recordId);
        setItems((current) => current.filter((entry) => entry.id !== item.id));
        setMessage(`${item.name} removed from menu.`);
      } catch (err) {
        setMessage(err.message || 'Unable to remove menu item.');
      }
      return;
    }
    setMessage(`${action} opened for ${item.name}.`);
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <PosPageHeader
        title="Menu Management"
        subtitle="Manage food items customers can order. Inventory stays in the Inventory module."
        actions={<PosPrimaryButton onClick={() => setShowForm((value) => !value)}><Plus size={15} />Add Item</PosPrimaryButton>}
      />

      {message && <div className="mb-4 rounded-md border border-blue-200 bg-blue-50 px-3 py-2 text-[13px] font-semibold text-blue-700">{message}</div>}

      {showForm && (
        <form onSubmit={(event) => { event.preventDefault(); if (form.name && form.price) addItem(); }} className="mb-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 text-[14px] font-bold text-slate-950">Add Menu Item</div>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
            <input value={form.name} onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))} placeholder="Item name *" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <input value={form.code} onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))} placeholder="Item code" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <SelectDropdown value={form.category} onChange={(category) => setForm((current) => ({ ...current, category }))} options={['Starters', 'Main Course', 'Beverages', 'Desserts']} />
            <input value={form.subcategory} onChange={(event) => setForm((current) => ({ ...current, subcategory: event.target.value }))} placeholder="Subcategory" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <SelectDropdown value={form.type} onChange={(type) => setForm((current) => ({ ...current, type }))} options={['Veg', 'Egg', 'Non-Veg']} />
            <input value={form.price} onChange={(event) => setForm((current) => ({ ...current, price: event.target.value }))} type="number" min="1" placeholder="Selling price *" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <SelectDropdown value={form.tax} onChange={(tax) => setForm((current) => ({ ...current, tax }))} options={['GST 5%', 'GST 12%', 'GST 18%', 'No Tax']} />
            <input value={form.availableFrom} onChange={(event) => setForm((current) => ({ ...current, availableFrom: event.target.value }))} placeholder="Available from" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <input value={form.availableUntil} onChange={(event) => setForm((current) => ({ ...current, availableUntil: event.target.value }))} placeholder="Available until" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500" />
            <SelectDropdown value={form.status} onChange={(status) => setForm((current) => ({ ...current, status }))} options={['Active', 'Inactive']} />
            <input value={form.channels.join(', ')} onChange={(event) => setForm((current) => ({ ...current, channels: event.target.value.split(',').map((item) => item.trim()).filter(Boolean) }))} placeholder="Dine In, Takeaway, Room Service" className="h-10 rounded-md border border-slate-200 px-3 text-[13px] outline-none focus:border-blue-500 md:col-span-2" />
            <textarea value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Description" rows={2} className="rounded-md border border-slate-200 px-3 py-2 text-[13px] outline-none focus:border-blue-500 md:col-span-2" />
            <PosPrimaryButton type="submit" className="self-start">Save Item</PosPrimaryButton>
          </div>
        </form>
      )}

      <section className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-4">
        <PosStatCard icon={UtensilsCrossed} label="Total Items" value={items.length} note="Active menu" tone="blue" />
        <PosStatCard icon={ChefHat} label="Main Course" value={items.filter((item) => item.category === 'Main Course').length} note="Kitchen items" tone="green" />
        <PosStatCard icon={Coffee} label="Beverages" value={items.filter((item) => item.category === 'Beverages').length} note="Bar counter" tone="orange" />
        <PosStatCard icon={UtensilsCrossed} label="Room Service" value={items.filter((item) => item.channels.includes('Room Service')).length} note="Chargeable to room" tone="violet" />
      </section>

      <PosCard>
        <div className="grid grid-cols-1 gap-3 border-b border-slate-100 p-4 lg:grid-cols-[minmax(0,1fr)_180px_150px_150px]">
          <PosSearch value={search} onChange={setSearch} placeholder="Search menu item..." />
          <SelectDropdown value={category} onChange={setCategory} options={['All Categories', 'Starters', 'Main Course', 'Beverages', 'Desserts']} />
          <SelectDropdown value={type} onChange={setType} options={['All Types', 'Veg', 'Egg', 'Non-Veg']} />
          <SelectDropdown value={status} onChange={setStatus} options={['All Status', 'Active', 'Inactive']} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 text-left text-[12px] text-slate-500">
                <th className="px-4 py-3 font-semibold">Item</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold">Price</th>
                <th className="px-4 py-3 font-semibold">Available For</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 text-right font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {pagination.pageRows.map((item) => (
                <tr key={item.id} className="border-t border-slate-100 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="text-[13px] font-bold text-slate-950">{item.name}</div>
                      <div className="text-[12px] text-slate-500">{item.code}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-[13px] font-semibold text-slate-700">{item.category}</td>
                  <td className="px-4 py-3"><PosBadge>{item.type}</PosBadge></td>
                  <td className="px-4 py-3 text-[13px] font-bold text-slate-950">{money(item.price)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {item.channels.slice(0, 2).map((channel) => <PosBadge key={channel}>{channel}</PosBadge>)}
                    </div>
                  </td>
                  <td className="px-4 py-3"><PosBadge>{item.status}</PosBadge></td>
                  <td className="px-4 py-3"><div className="flex justify-end"><PosTableActions item={item} onAction={handleItemAction} /></div></td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-[13px] text-slate-500">No menu items found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <PaginationFooter page={pagination.currentPage} pageSize={pageSize} total={rows.length} start={pagination.start} end={pagination.end} totalPages={pagination.totalPages} onPageChange={setPage} onPageSizeChange={setPageSize} />
      </PosCard>
    </div>
  );
}

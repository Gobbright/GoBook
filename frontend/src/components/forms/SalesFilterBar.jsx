import { useEffect, useState } from 'react';
import { ChevronDown, SlidersHorizontal, X } from 'lucide-react';

import { CustomerPicker } from './CustomerPicker.jsx';
import { SelectDropdown } from './SelectDropdown.jsx';

const SELECT = 'h-11 w-full border border-[#dbe4ef] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] bg-white text-[#374151] cursor-pointer sm:h-auto sm:w-auto sm:rounded-md';
const TEXT = 'h-11 w-full border border-[#dbe4ef] rounded-lg px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] bg-white text-[#111827] sm:h-auto sm:w-32 sm:rounded-md';

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Online'];
const PAYMENT_STATUSES = ['Unpaid', 'Partial', 'Paid', 'Overdue'];

function DebouncedInput({ value, onChange, delay = 400, ...props }) {
  const [local, setLocal] = useState(value || '');

  useEffect(() => { setLocal(value || ''); }, [value]);

  useEffect(() => {
    if (local === (value || '')) return undefined;
    const timer = window.setTimeout(() => onChange(local), delay);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [local]);

  return <input {...props} value={local} onChange={(e) => setLocal(e.target.value)} />;
}

export function SalesFilterBar({ filters, onChange, fields, customerOptions = null, customerPlaceholder = 'Customer...' }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const has = (key) => fields.includes(key);
  const set = (key) => (value) => onChange(key, value);
  const activeCount = fields.reduce((count, key) => {
    if (key === 'amountRange') return count + (filters.amountMin ? 1 : 0) + (filters.amountMax ? 1 : 0);
    return count + (filters[key] ? 1 : 0);
  }, 0);

  const clearAll = () => fields.forEach((key) => {
    if (key === 'amountRange') {
      onChange('amountMin', '');
      onChange('amountMax', '');
    } else {
      onChange(key, '');
    }
  });

  const controls = [
    has('paymentMethod') && {
      key: 'paymentMethod',
      node: <SelectDropdown buttonClassName={SELECT} value={filters.paymentMethod || ''} onChange={set('paymentMethod')} options={[{ value: '', label: 'All Payment Modes' }, ...PAYMENT_METHODS.map((m) => ({ value: m, label: m }))]} />,
    },
    has('paymentStatus') && {
      key: 'paymentStatus',
      primary: true,
      node: <SelectDropdown buttonClassName={SELECT} value={filters.paymentStatus || ''} onChange={set('paymentStatus')} options={[{ value: '', label: 'All Payment Status' }, ...PAYMENT_STATUSES.map((s) => ({ value: s, label: s }))]} />,
    },
    has('customer') && {
      key: 'customer',
      primary: true,
      node: <CustomerPicker className="w-full sm:w-auto [&_input]:h-11 [&_input]:w-full [&_input]:rounded-lg sm:[&_input]:h-auto sm:[&_input]:w-auto sm:[&_input]:rounded-md" value={filters.customer || ''} onChange={set('customer')} options={customerOptions} placeholder={customerPlaceholder} />,
    },
    has('city') && { key: 'city', node: <DebouncedInput className={TEXT} placeholder="City" value={filters.city} onChange={set('city')} /> },
    has('state') && { key: 'state', node: <DebouncedInput className={TEXT} placeholder="State" value={filters.state} onChange={set('state')} /> },
    has('gstType') && {
      key: 'gstType',
      primary: true,
      node: <SelectDropdown buttonClassName={SELECT} value={filters.gstType || ''} onChange={set('gstType')} options={[{ value: '', label: 'All Bills' }, { value: 'with', label: 'With GST' }, { value: 'without', label: 'Without GST' }]} />,
    },
    has('supplyType') && {
      key: 'supplyType',
      node: <SelectDropdown buttonClassName={SELECT} value={filters.supplyType || ''} onChange={set('supplyType')} options={[{ value: '', label: 'All Supply Types' }, { value: 'intrastate', label: 'Intrastate' }, { value: 'interstate', label: 'Interstate' }]} />,
    },
    has('amountRange') && {
      key: 'amountRange',
      node: (
        <div className="grid w-full grid-cols-[1fr_auto_1fr] items-center gap-2 sm:flex sm:w-auto sm:gap-1">
          <DebouncedInput className={`${TEXT} sm:w-24`} type="number" min="0" placeholder="Min Rs" value={filters.amountMin} onChange={set('amountMin')} />
          <span className="text-[12px] text-[#536173]">-</span>
          <DebouncedInput className={`${TEXT} sm:w-24`} type="number" min="0" placeholder="Max Rs" value={filters.amountMax} onChange={set('amountMax')} />
        </div>
      ),
    },
    has('itemType') && {
      key: 'itemType',
      node: <SelectDropdown buttonClassName={SELECT} value={filters.itemType || ''} onChange={set('itemType')} options={[{ value: '', label: 'All Item Types' }, { value: 'Product', label: 'Product' }, { value: 'Service', label: 'Service' }]} />,
    },
    has('hsn') && { key: 'hsn', node: <DebouncedInput className={TEXT} placeholder="HSN" value={filters.hsn} onChange={set('hsn')} /> },
    has('productName') && { key: 'productName', node: <DebouncedInput className={TEXT} placeholder="Product name" value={filters.productName} onChange={set('productName')} /> },
    has('barcode') && { key: 'barcode', node: <DebouncedInput className={TEXT} placeholder="Barcode" value={filters.barcode} onChange={set('barcode')} /> },
    has('irnStatus') && {
      key: 'irnStatus',
      node: <SelectDropdown buttonClassName={SELECT} value={filters.irnStatus || ''} onChange={set('irnStatus')} options={[{ value: '', label: 'All IRN Status' }, { value: 'yes', label: 'Generated' }, { value: 'no', label: 'Not Generated' }]} />,
    },
    has('ewbStatus') && {
      key: 'ewbStatus',
      node: <SelectDropdown buttonClassName={SELECT} value={filters.ewbStatus || ''} onChange={set('ewbStatus')} options={[{ value: '', label: 'All E-Way Bill Status' }, { value: 'yes', label: 'Generated' }, { value: 'no', label: 'Not Generated' }]} />,
    },
  ].filter(Boolean);
  const primaryControls = controls.filter((control) => control.primary);
  const advancedControls = controls.filter((control) => !control.primary);

  return (
    <div className="w-full sm:contents">
      <div className="hidden sm:contents">{controls.map((control) => <div key={control.key}>{control.node}</div>)}</div>
      <div className="grid gap-2 sm:hidden">
        <div className="grid grid-cols-2 gap-2">
          {primaryControls.slice(0, 2).map((control) => <div key={control.key} className="min-w-0">{control.node}</div>)}
        </div>
        {primaryControls.slice(2).map((control) => <div key={control.key} className="min-w-0">{control.node}</div>)}
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <button
            type="button"
            onClick={() => setMobileOpen((open) => !open)}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-[#dbe4ef] bg-white px-3 text-[13px] font-bold text-[#374151]"
          >
            <SlidersHorizontal size={15} />
            Filters
            {activeCount > 0 && <span className="rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] leading-none text-white">{activeCount}</span>}
            <ChevronDown size={15} className={`transition ${mobileOpen ? 'rotate-180' : ''}`} />
          </button>
          {activeCount > 0 && (
            <button type="button" onClick={clearAll} className="inline-flex h-11 w-11 items-center justify-center rounded-lg border border-[#dbe4ef] bg-white text-[#536173]" title="Clear filters">
              <X size={16} />
            </button>
          )}
        </div>
        {mobileOpen && (
          <div className="grid gap-2 rounded-xl border border-[#edf2f7] bg-[#f8fbff] p-2">
            {advancedControls.map((control) => <div key={control.key} className="min-w-0">{control.node}</div>)}
          </div>
        )}
      </div>
    </div>
  );
}

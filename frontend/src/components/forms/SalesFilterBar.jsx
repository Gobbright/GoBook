import { useEffect, useState } from 'react';

import { CustomerPicker } from './CustomerPicker.jsx';
import { SelectDropdown } from './SelectDropdown.jsx';

const SELECT = 'border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] bg-white text-[#374151] cursor-pointer';
const TEXT = 'border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] bg-white text-[#111827] w-32';

const PAYMENT_METHODS = ['Cash', 'UPI', 'Bank Transfer', 'Cheque', 'Online'];
const PAYMENT_STATUSES = ['Unpaid', 'Partial', 'Paid', 'Overdue'];

// Free-text filter inputs (city, state, HSN, product name, barcode, amount)
// keep their own local state so every keystroke is drawn instantly, and only
// push the value up (which triggers a re-fetch on the page) once the user
// pauses — otherwise each keystroke reloads the whole table mid-type, which
// reads as the page "shaking".
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

// Renders whichever of the 12 sales-report filters are requested via `fields`,
// wired to a single flat `filters` state object owned by the page. Shared
// across Bills Register, Receivables, Quotations, Credit/Debit Notes,
// Delivery Challans, E-Invoice and E-Way Bill pages so each one only needs to
// declare which filters apply to it, not re-implement the inputs.
export function SalesFilterBar({ filters, onChange, fields }) {
  const has = (key) => fields.includes(key);
  const set = (key) => (value) => onChange(key, value);

  return (
    <>
      {has('paymentMethod') && (
        <SelectDropdown buttonClassName={SELECT} value={filters.paymentMethod || ''} onChange={set('paymentMethod')} options={[{ value: '', label: 'All Payment Modes' }, ...PAYMENT_METHODS.map((m) => ({ value: m, label: m }))]} />
      )}

      {has('paymentStatus') && (
        <SelectDropdown buttonClassName={SELECT} value={filters.paymentStatus || ''} onChange={set('paymentStatus')} options={[{ value: '', label: 'All Payment Status' }, ...PAYMENT_STATUSES.map((s) => ({ value: s, label: s }))]} />
      )}

      {has('customer') && (
        <CustomerPicker value={filters.customer || ''} onChange={set('customer')} />
      )}

      {has('city') && (
        <DebouncedInput className={TEXT} placeholder="City" value={filters.city} onChange={set('city')} />
      )}

      {has('state') && (
        <DebouncedInput className={TEXT} placeholder="State" value={filters.state} onChange={set('state')} />
      )}

      {has('gstType') && (
        <SelectDropdown buttonClassName={SELECT} value={filters.gstType || ''} onChange={set('gstType')} options={[{ value: '', label: 'All Bills' }, { value: 'with', label: 'With GST' }, { value: 'without', label: 'Without GST' }]} />
      )}

      {has('supplyType') && (
        <SelectDropdown buttonClassName={SELECT} value={filters.supplyType || ''} onChange={set('supplyType')} options={[{ value: '', label: 'All Supply Types' }, { value: 'intrastate', label: 'Intrastate' }, { value: 'interstate', label: 'Interstate' }]} />
      )}

      {has('amountRange') && (
        <div className="flex items-center gap-1">
          <DebouncedInput className={`${TEXT} w-24`} type="number" min="0" placeholder="Min ₹" value={filters.amountMin} onChange={set('amountMin')} />
          <span className="text-[12px] text-[#536173]">-</span>
          <DebouncedInput className={`${TEXT} w-24`} type="number" min="0" placeholder="Max ₹" value={filters.amountMax} onChange={set('amountMax')} />
        </div>
      )}

      {has('itemType') && (
        <SelectDropdown buttonClassName={SELECT} value={filters.itemType || ''} onChange={set('itemType')} options={[{ value: '', label: 'All Item Types' }, { value: 'Product', label: 'Product' }, { value: 'Service', label: 'Service' }]} />
      )}

      {has('hsn') && (
        <DebouncedInput className={TEXT} placeholder="HSN" value={filters.hsn} onChange={set('hsn')} />
      )}

      {has('productName') && (
        <DebouncedInput className={TEXT} placeholder="Product name" value={filters.productName} onChange={set('productName')} />
      )}

      {has('barcode') && (
        <DebouncedInput className={TEXT} placeholder="Barcode" value={filters.barcode} onChange={set('barcode')} />
      )}

      {has('irnStatus') && (
        <SelectDropdown buttonClassName={SELECT} value={filters.irnStatus || ''} onChange={set('irnStatus')} options={[{ value: '', label: 'All IRN Status' }, { value: 'yes', label: 'Generated' }, { value: 'no', label: 'Not Generated' }]} />
      )}

      {has('ewbStatus') && (
        <SelectDropdown buttonClassName={SELECT} value={filters.ewbStatus || ''} onChange={set('ewbStatus')} options={[{ value: '', label: 'All E-Way Bill Status' }, { value: 'yes', label: 'Generated' }, { value: 'no', label: 'Not Generated' }]} />
      )}
    </>
  );
}

import { useEffect, useState } from 'react';

import { CustomerPicker } from './CustomerPicker.jsx';

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
        <select className={SELECT} value={filters.paymentMethod || ''} onChange={(e) => set('paymentMethod')(e.target.value)}>
          <option value="">All Payment Modes</option>
          {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
      )}

      {has('paymentStatus') && (
        <select className={SELECT} value={filters.paymentStatus || ''} onChange={(e) => set('paymentStatus')(e.target.value)}>
          <option value="">All Payment Status</option>
          {PAYMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
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
        <select className={SELECT} value={filters.gstType || ''} onChange={(e) => set('gstType')(e.target.value)}>
          <option value="">All Bills</option>
          <option value="with">With GST</option>
          <option value="without">Without GST</option>
        </select>
      )}

      {has('supplyType') && (
        <select className={SELECT} value={filters.supplyType || ''} onChange={(e) => set('supplyType')(e.target.value)}>
          <option value="">All Supply Types</option>
          <option value="intrastate">Intrastate</option>
          <option value="interstate">Interstate</option>
        </select>
      )}

      {has('amountRange') && (
        <div className="flex items-center gap-1">
          <DebouncedInput className={`${TEXT} w-24`} type="number" min="0" placeholder="Min ₹" value={filters.amountMin} onChange={set('amountMin')} />
          <span className="text-[12px] text-[#536173]">-</span>
          <DebouncedInput className={`${TEXT} w-24`} type="number" min="0" placeholder="Max ₹" value={filters.amountMax} onChange={set('amountMax')} />
        </div>
      )}

      {has('itemType') && (
        <select className={SELECT} value={filters.itemType || ''} onChange={(e) => set('itemType')(e.target.value)}>
          <option value="">All Item Types</option>
          <option value="Product">Product</option>
          <option value="Service">Service</option>
        </select>
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
        <select className={SELECT} value={filters.irnStatus || ''} onChange={(e) => set('irnStatus')(e.target.value)}>
          <option value="">All IRN Status</option>
          <option value="yes">Generated</option>
          <option value="no">Not Generated</option>
        </select>
      )}

      {has('ewbStatus') && (
        <select className={SELECT} value={filters.ewbStatus || ''} onChange={(e) => set('ewbStatus')(e.target.value)}>
          <option value="">All E-Way Bill Status</option>
          <option value="yes">Generated</option>
          <option value="no">Not Generated</option>
        </select>
      )}
    </>
  );
}

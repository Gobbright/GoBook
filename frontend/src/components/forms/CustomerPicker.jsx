import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

import { api } from '../../services/api.js';

const INPUT =
  'border border-[#dbe4ef] rounded-md pl-8 pr-8 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] bg-white text-[#111827]';

// Text input + suggestion dropdown for filtering by customer name. Selecting a
// suggestion calls onChange with the customer's name (a plain string, since
// Invoice documents embed a customer snapshot rather than referencing an id).
export function CustomerPicker({ value, onChange, placeholder = 'Customer…', className = '' }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    if (!open || !query.trim()) { setSuggestions([]); return undefined; }
    let active = true;
    const timer = window.setTimeout(() => {
      api.listCustomers(query.trim())
        .then((res) => {
          if (!active) return;
          const rows = Array.isArray(res) ? res : res?.data;
          setSuggestions(Array.isArray(rows) ? rows.slice(0, 8) : []);
        })
        .catch(() => { if (active) setSuggestions([]); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, open]);

  useEffect(() => {
    function handleClickOutside(e) {
      if (boxRef.current && !boxRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  function select(customer) {
    setQuery(customer.name || '');
    onChange(customer.name || '');
    setOpen(false);
  }

  function clear() {
    setQuery('');
    onChange('');
    setSuggestions([]);
  }

  return (
    <div className={`relative ${className}`} ref={boxRef}>
      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
      <input
        className={INPUT}
        placeholder={placeholder}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange(''); }}
      />
      {query && (
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[#94a3b8] hover:text-[#374151] bg-transparent border-0 cursor-pointer p-0.5"
          onClick={clear}
          title="Clear customer filter"
        >
          <X size={13} />
        </button>
      )}
      {open && suggestions.length > 0 && (
        <div className="absolute z-20 mt-1 w-64 max-h-60 overflow-y-auto bg-white border border-[#dbe4ef] rounded-md shadow-lg">
          {suggestions.map((c) => (
            <button
              key={c._id ?? c.id ?? c.name}
              type="button"
              className="w-full text-left px-3 py-2 text-[13px] hover:bg-gray-50 cursor-pointer border-0 bg-transparent font-[inherit]"
              onMouseDown={() => select(c)}
            >
              <div className="font-medium text-[#111827]">{c.name}</div>
              {(c.phone || c.gstin) && (
                <div className="text-[11px] text-[#94a3b8] mt-0.5">{[c.phone, c.gstin].filter(Boolean).join(' · ')}</div>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

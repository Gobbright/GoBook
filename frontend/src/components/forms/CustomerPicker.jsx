import { useEffect, useRef, useState } from 'react';
import { Search, X } from 'lucide-react';

import { api } from '../../services/api.js';

const INPUT =
  'border border-[#dbe4ef] rounded-md pl-8 pr-8 py-2 text-[13px] outline-none focus:border-blue-500 font-[inherit] bg-white text-[#111827]';

function sameCustomerName(a = '', b = '') {
  return String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();
}

// Text input + suggestion dropdown for filtering by customer name. Selecting a
// suggestion calls onChange with the customer's name (a plain string, since
// Invoice documents embed a customer snapshot rather than referencing an id).
export function CustomerPicker({ value, onChange, placeholder = 'Customer…', className = '', options = null }) {
  const [query, setQuery] = useState(value || '');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const boxRef = useRef(null);
  const optionRefs = useRef([]);

  useEffect(() => { setQuery(value || ''); }, [value]);

  useEffect(() => {
    if (!open || !query.trim()) { setSuggestions([]); return undefined; }
    if (Array.isArray(options)) {
      const q = query.trim().toLowerCase();
      const nextSuggestions = options
        .filter((customer) => [
          customer.name,
          customer.phone,
          customer.gstin,
          customer.city,
          customer.state,
        ].some((part) => String(part || '').toLowerCase().includes(q)))
        .slice(0, 8);
      setSuggestions(nextSuggestions);
      setHighlighted(nextSuggestions.findIndex((customer) => sameCustomerName(customer.name, value || query)));
      return undefined;
    }
    let active = true;
    const timer = window.setTimeout(() => {
      api.listCustomers(query.trim())
        .then((res) => {
          if (!active) return;
          const rows = Array.isArray(res) ? res : res?.data;
          const nextSuggestions = Array.isArray(rows) ? rows.slice(0, 8) : [];
          setSuggestions(nextSuggestions);
          setHighlighted(nextSuggestions.findIndex((customer) => sameCustomerName(customer.name, value || query)));
        })
        .catch(() => { if (active) setSuggestions([]); });
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [query, open, options, value]);

  useEffect(() => {
    if (highlighted < 0) return;
    optionRefs.current[highlighted]?.scrollIntoView({ block: 'nearest' });
  }, [highlighted]);

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
    setHighlighted(-1);
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setHighlighted((index) => Math.min(suggestions.length - 1, index + 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setHighlighted((index) => Math.max(0, index - 1));
      return;
    }
    if (event.key === 'Enter' && open && highlighted >= 0 && suggestions[highlighted]) {
      event.preventDefault();
      select(suggestions[highlighted]);
      return;
    }
    if (event.key === 'Escape') {
      setOpen(false);
      setHighlighted(-1);
      return;
    }
    if (event.key === 'Tab') {
      setOpen(false);
      setHighlighted(-1);
    }
  }

  return (
    <div className={`relative ${className}`} ref={boxRef}>
      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94a3b8] pointer-events-none" />
      <input
        className={INPUT}
        placeholder={placeholder}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); setHighlighted(-1); if (!e.target.value) onChange(''); }}
        onKeyDown={handleKeyDown}
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
          {suggestions.map((c, index) => (
            <button
              key={c._id ?? c.id ?? c.name}
              ref={(node) => { optionRefs.current[index] = node; }}
              type="button"
              tabIndex={-1}
              className={`w-full text-left px-3 py-2 text-[13px] cursor-pointer border-0 font-[inherit] ${highlighted === index || sameCustomerName(c.name, value) ? 'bg-blue-200' : 'bg-transparent hover:bg-blue-200'}`}
              onMouseDown={() => select(c)}
              onMouseEnter={() => setHighlighted(index)}
            >
              <div className={`font-medium ${highlighted === index || sameCustomerName(c.name, value) ? 'text-blue-900' : 'text-[#111827]'}`}>{c.name}</div>
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

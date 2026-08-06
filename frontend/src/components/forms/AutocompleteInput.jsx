import { useEffect, useRef, useState } from 'react';

// Replaces `<input list="..."> + <datalist>` — same native-popup text-size
// problem as <select> (see SelectDropdown.jsx), but for a free-text field with
// suggestions rather than a closed set of choices.
export function AutocompleteInput({ value, onChange, options = [], placeholder = '', className = '', inputClassName = '', maxLength, icon = null, onKeyDown, onFocus, ...inputProps }) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef(null);

  // Options are plain strings almost everywhere this is used; a caller can
  // optionally pass { value, label, badge } objects instead (e.g. to tag each
  // suggestion as Product/Service) without affecting any other usage.
  const normalized = options.map((opt) => (typeof opt === 'string' ? { value: opt, label: opt } : opt));
  const query = String(value || '').trim().toLowerCase();
  const filtered = query
    ? normalized.filter((opt) => opt.label.toLowerCase().includes(query) && opt.label.toLowerCase() !== query)
    : normalized;
  const suggestions = filtered.slice(0, 20);

  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // On short/scrolled mobile viewports the field can sit close to the bottom
  // of the page's scroll container, leaving no room for the list to render
  // below it (it gets silently clipped instead of shown). Flip it above the
  // field whenever there isn't enough space underneath.
  function openDropdown() {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 240 && rect.top > spaceBelow);
    }
    setOpen(true);
  }

  function choose(opt) {
    onChange(opt.value);
    setOpen(false);
  }

  function handleKeyDown(e) {
    if (!open || suggestions.length === 0) {
      if (e.key === 'Escape') setOpen(false);
      onKeyDown?.(e);
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((i) => Math.min(suggestions.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter' && highlighted >= 0) {
      e.preventDefault();
      choose(suggestions[highlighted]);
    } else if (e.key === 'Escape') {
      setOpen(false);
    } else {
      onKeyDown?.(e);
    }
  }

  return (
    <div className={`relative ${className}`} ref={ref}>
      {icon}
      <input
        {...inputProps}
        className={`border border-[#dbe4ef] rounded-md py-2 text-[13px] w-full outline-none focus:border-blue-500 font-[inherit] ${icon ? 'pl-8 pr-3' : 'px-3'} ${inputClassName}`}
        value={value || ''}
        maxLength={maxLength}
        onChange={(e) => { onChange(e.target.value); openDropdown(); setHighlighted(-1); }}
        onFocus={(e) => { openDropdown(); onFocus?.(e); }}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
      />
      {open && suggestions.length > 0 && (
        <div className={`absolute z-50 left-0 right-0 bg-white border border-[#dde6f2] rounded-lg shadow-lg py-1 max-h-56 overflow-y-auto ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
          {suggestions.map((opt, index) => (
            <button
              key={opt.value}
              type="button"
              onMouseEnter={() => setHighlighted(index)}
              onMouseDown={(e) => { e.preventDefault(); choose(opt); }}
              className={`w-full flex items-center justify-between gap-2 text-left px-3 py-2 text-[13px] cursor-pointer border-0 font-[inherit] ${
                index === highlighted ? 'bg-[#f8fafc] text-[#111827]' : 'bg-transparent text-[#111827]'
              }`}
            >
              <span className="truncate">{opt.label}</span>
              {opt.badge && (
                <span className="flex-none text-[10px] font-semibold uppercase tracking-wide text-[#64748b] bg-[#f1f5f9] rounded px-1.5 py-0.5">
                  {opt.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

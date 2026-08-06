import { useEffect, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';

// A small custom-styled dropdown to replace native <select> elements where the
// browser's native option-list rendering (which ignores page CSS and instead
// follows OS-level text scaling) makes the options render far larger than the
// rest of the page, especially on mobile/Chrome+Windows.
export function SelectDropdown({ value, onChange, options, placeholder = 'Select...', className = '', buttonClassName = '', disabled = false, ...buttonProps }) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef(null);

  const normalized = options.map((opt) => (typeof opt === 'string' || typeof opt === 'number' ? { value: opt, label: String(opt) } : opt));
  const selectedIndex = normalized.findIndex((o) => o.value === value);
  const selected = normalized[selectedIndex];

  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  // On short/scrolled mobile viewports the trigger can sit close to the
  // bottom of the page's scroll container, leaving no room for the list to
  // render below it (it gets silently clipped instead of shown). Flip it
  // above the trigger whenever there isn't enough space underneath.
  function openList() {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      setDropUp(spaceBelow < 240 && rect.top > spaceBelow);
    }
    setHighlighted(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  function choose(index) {
    const opt = normalized[index];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
  }

  function handleKeyDown(e) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        openList();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlighted((i) => Math.min(normalized.length - 1, i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => Math.max(0, i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(highlighted);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    <div className={`relative ${className}`} ref={ref} onKeyDown={handleKeyDown}>
      <button
        {...buttonProps}
        type="button"
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : openList())}
        className={`flex items-center justify-between gap-2 border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] w-full outline-none bg-white font-[inherit] focus:border-blue-500 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${buttonClassName}`}
      >
        <span className={`truncate ${selected ? 'text-[#111827]' : 'text-[#94a3b8]'}`}>{selected ? selected.label : placeholder}</span>
        <ChevronDown size={14} className={`text-[#94a3b8] transition-transform flex-none ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className={`absolute z-50 left-0 right-0 bg-white border border-[#dde6f2] rounded-lg shadow-lg py-1 max-h-56 overflow-y-auto ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'}`}>
          {normalized.map((opt, index) => (
            <button
              key={opt.value}
              type="button"
              onMouseEnter={() => setHighlighted(index)}
              onClick={() => choose(index)}
              className={`w-full text-left px-3 py-2 text-[13px] cursor-pointer border-0 font-[inherit] ${
                opt.value === value ? 'text-blue-600 font-semibold bg-blue-50' : index === highlighted ? 'bg-[#f8fafc] text-[#111827]' : 'bg-transparent text-[#111827]'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

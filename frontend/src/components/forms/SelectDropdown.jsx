import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

// A small custom-styled dropdown to replace native <select> elements where the
// browser's native option-list rendering (which ignores page CSS and instead
// follows OS-level text scaling) makes the options render far larger than the
// rest of the page, especially on mobile/Chrome+Windows.
export function SelectDropdown({ value, onChange, options, placeholder = 'Select...', className = '', buttonClassName = '', disabled = false, portal = false, ...buttonProps }) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [dropUp, setDropUp] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const ref = useRef(null);
  const menuRef = useRef(null);
  const optionRefs = useRef([]);

  const normalized = options.map((opt) => (typeof opt === 'string' || typeof opt === 'number' ? { value: opt, label: String(opt) } : opt));
  const selectedIndex = normalized.findIndex((o) => o.value === value);
  const selected = normalized[selectedIndex];

  useEffect(() => {
    if (!open || highlighted < 0) return;
    optionRefs.current[highlighted]?.scrollIntoView({ block: 'nearest' });
  }, [open, highlighted]);

  useEffect(() => {
    function handleOutside(e) {
      if (ref.current?.contains(e.target) || menuRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  function updateMenuPosition() {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const nextDropUp = spaceBelow < 240 && rect.top > spaceBelow;
    setDropUp(nextDropUp);
    if (portal) {
      setMenuStyle({
        left: rect.left,
        width: rect.width,
        top: nextDropUp ? undefined : rect.bottom + 4,
        bottom: nextDropUp ? window.innerHeight - rect.top + 4 : undefined,
      });
    }
  }

  useEffect(() => {
    if (!open || !portal) return undefined;
    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [open, portal]);

  // On short/scrolled mobile viewports the trigger can sit close to the
  // bottom of the page's scroll container, leaving no room for the list to
  // render below it (it gets silently clipped instead of shown). Flip it
  // above the trigger whenever there isn't enough space underneath.
  function openList() {
    updateMenuPosition();
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
      setHighlighted((i) => Math.min(normalized.length - 1, i < 0 ? 0 : i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlighted((i) => Math.max(0, i < 0 ? normalized.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      choose(highlighted);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
    }
  }

  const menu = open ? (
    <div
      ref={menuRef}
      style={portal && menuStyle ? menuStyle : undefined}
      className={`${portal ? 'fixed' : `absolute left-0 right-0 ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'}`} z-50 bg-white border border-[#dde6f2] rounded-lg shadow-lg py-1 max-h-56 overflow-y-auto`}
    >
      {normalized.map((opt, index) => (
        <button
          key={opt.value}
          ref={(node) => { optionRefs.current[index] = node; }}
          type="button"
          onMouseEnter={() => setHighlighted(index)}
          onClick={() => choose(index)}
          className={`w-full flex items-center justify-between gap-2 text-left py-2 pr-3 text-[13px] cursor-pointer border-0 font-[inherit] ${opt.indent ? 'pl-7' : 'pl-3'} ${
            opt.activeOption || opt.value === value ? 'text-blue-700 font-semibold bg-blue-100 shadow-[inset_3px_0_0_#2563eb]' : index === highlighted ? 'bg-blue-50 text-[#0f172a] shadow-[inset_3px_0_0_#3b82f6]' : 'bg-transparent text-[#111827]'
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
  ) : null;

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

      {portal ? createPortal(menu, document.body) : menu}
    </div>
  );
}

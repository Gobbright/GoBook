import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';

// A small custom-styled dropdown to replace native <select> elements where the
// browser's native option-list rendering (which ignores page CSS and instead
// follows OS-level text scaling) makes the options render far larger than the
// rest of the page, especially on mobile/Chrome+Windows.
export function SelectDropdown({
  value,
  onChange,
  options,
  placeholder = 'Select...',
  className = '',
  buttonClassName = '',
  selectedLabelClassName = '',
  optionLabelClassName = '',
  menuClassName = '',
  searchable = false,
  allowCustom = false,
  customLabel = 'Use custom',
  disabled = false,
  hideChevron = false,
  portal = false,
  ...buttonProps
}) {
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const [query, setQuery] = useState('');
  const [dropUp, setDropUp] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const ref = useRef(null);
  const menuRef = useRef(null);
  const optionRefs = useRef([]);

  const normalized = options.map((opt) => (typeof opt === 'string' || typeof opt === 'number' ? { value: opt, label: String(opt) } : opt));
  const filtered = searchable && query.trim()
    ? normalized.filter((opt) => String(opt.label ?? opt.value ?? '').toLowerCase().includes(query.trim().toLowerCase()))
    : normalized;
  const customValue = query.trim();
  const showCustom = allowCustom && customValue && !normalized.some((opt) => String(opt.label ?? opt.value ?? '').toLowerCase() === customValue.toLowerCase());
  const selectedIndex = normalized.findIndex((o) => o.value === value);
  const selected = normalized[selectedIndex];
  const displayLabel = selected ? selected.label : String(value ?? '').trim();

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

  const updateMenuPosition = useCallback(() => {
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
  }, [portal]);

  useEffect(() => {
    if (!open || !portal) return undefined;
    updateMenuPosition();
    window.addEventListener('resize', updateMenuPosition);
    window.addEventListener('scroll', updateMenuPosition, true);
    return () => {
      window.removeEventListener('resize', updateMenuPosition);
      window.removeEventListener('scroll', updateMenuPosition, true);
    };
  }, [open, portal, updateMenuPosition]);

  // On short/scrolled mobile viewports the trigger can sit close to the
  // bottom of the page's scroll container, leaving no room for the list to
  // render below it (it gets silently clipped instead of shown). Flip it
  // above the trigger whenever there isn't enough space underneath.
  function openList() {
    updateMenuPosition();
    setQuery('');
    setHighlighted(selectedIndex >= 0 ? selectedIndex : 0);
    setOpen(true);
  }

  function choose(index) {
    const opt = filtered[index];
    if (!opt) return;
    onChange(opt.value);
    setOpen(false);
  }

  function handleKeyDown(e) {
    if (!open) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        e.stopPropagation();
        openList();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      setHighlighted((i) => Math.min(filtered.length - 1, i < 0 ? 0 : i + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
      setHighlighted((i) => Math.max(0, i < 0 ? normalized.length - 1 : i - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      if (filtered[highlighted]) choose(highlighted);
      else if (showCustom) {
        onChange(customValue);
        setOpen(false);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  }

  const menu = open ? (
    <div
      ref={menuRef}
      style={portal && menuStyle ? menuStyle : undefined}
      className={`${portal ? 'fixed z-[9999]' : `absolute left-0 right-0 ${dropUp ? 'bottom-full mb-1' : 'top-full mt-1'} z-50`} bg-white border border-[#dde6f2] rounded-lg shadow-lg py-1 max-h-56 overflow-y-auto ${searchable ? 'scroll-pt-12' : ''} ${menuClassName}`}
    >
      {searchable && (
        <div className="sticky top-0 z-10 border-b border-[#edf2f7] bg-white p-2">
          <input
            className="h-8 w-full rounded-md border border-[#dbe4ef] px-2 text-[12px] outline-none focus:border-blue-500"
            value={query}
            placeholder="Type to filter..."
            autoFocus
            onChange={(event) => {
              setQuery(event.target.value);
              setHighlighted(0);
            }}
            onKeyDown={(event) => {
              if (event.key === 'ArrowDown' || event.key === 'ArrowUp' || event.key === 'Enter' || event.key === 'Escape') {
                handleKeyDown(event);
              }
            }}
          />
        </div>
      )}
      {filtered.map((opt, index) => (
        <button
          key={opt.value}
          ref={(node) => { optionRefs.current[index] = node; }}
          type="button"
          tabIndex={-1}
          onMouseEnter={() => setHighlighted(index)}
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            choose(index);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              choose(index);
            }
          }}
          className={`w-full scroll-mt-12 flex items-center justify-between gap-2 text-left py-2 pr-3 text-[13px] cursor-pointer border-0 font-[inherit] hover:bg-blue-200 ${opt.indent ? 'pl-7' : 'pl-3'} ${
            opt.activeOption || opt.value === value ? 'text-blue-900 font-semibold bg-blue-200 shadow-[inset_3px_0_0_#2563eb]' : index === highlighted ? 'bg-blue-200 text-[#0f172a] shadow-[inset_3px_0_0_#3b82f6]' : 'bg-transparent text-[#111827]'
          }`}
        >
          <span className={optionLabelClassName || 'truncate'}>{opt.labelNode || opt.label}</span>
          {opt.badge && (
            <span className="flex-none text-[10px] font-semibold uppercase tracking-wide text-[#64748b] bg-[#f1f5f9] rounded px-1.5 py-0.5">
              {opt.badge}
            </span>
          )}
        </button>
      ))}
      {showCustom && (
        <button
          type="button"
          tabIndex={-1}
          className="w-full border-0 border-t border-[#edf2f7] bg-white px-3 py-2 text-left text-[12px] font-semibold text-blue-700 hover:bg-blue-200"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onChange(customValue);
            setOpen(false);
          }}
        >
          {customLabel}: {customValue}
        </button>
      )}
    </div>
  ) : null;

  return (
    <div className={`relative ${className}`} ref={ref} onKeyDown={handleKeyDown}>
      <button
        {...buttonProps}
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          open ? setOpen(false) : openList();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            e.stopPropagation();
            open ? choose(highlighted) : openList();
          }
        }}
        className={`flex items-center justify-between gap-2 border border-[#dbe4ef] rounded-md px-3 py-2 text-[13px] w-full outline-none bg-white font-[inherit] focus:border-blue-500 ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'} ${buttonClassName}`}
      >
        <span className={`${selectedLabelClassName || 'truncate'} ${displayLabel ? 'text-[#111827]' : 'text-[#94a3b8]'}`}>{displayLabel || placeholder}</span>
        {!hideChevron && <ChevronDown size={14} className={`text-[#94a3b8] transition-transform flex-none ${open ? 'rotate-180' : ''}`} />}
      </button>

      {portal ? createPortal(menu, document.body) : menu}
    </div>
  );
}

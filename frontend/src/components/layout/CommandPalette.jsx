import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';

import { getSidebarSections } from '../../constants/navigation.js';
import { useCurrentUser } from '../../hooks/useCurrentUser.js';
import { normalizeAppPath } from '../../routes/navigation.js';

function flattenCommands(sections) {
  const commands = [];
  for (const section of sections) {
    for (const item of section.items) {
      if (item.href) {
        commands.push({ label: item.label, section: section.title, href: normalizeAppPath(item.href) });
      }
      for (const child of item.children || []) {
        if (child.href) {
          commands.push({ label: child.label, section: item.label, href: normalizeAppPath(child.href) });
        }
      }
    }
  }
  return commands;
}

export function CommandPalette({ open, onClose }) {
  const navigate = useNavigate();
  const storedUser = useCurrentUser();
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  const allCommands = useMemo(() => {
    const user = storedUser || {};
    return flattenCommands(getSidebarSections(user.category || 'other', user));
  }, [storedUser]);

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return allCommands.slice(0, 8);
    return allCommands
      .filter((c) => c.label.toLowerCase().includes(q) || c.section.toLowerCase().includes(q))
      .slice(0, 8);
  }, [allCommands, query]);

  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  function go(command) {
    if (!command) return;
    navigate(command.href);
    onClose();
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      go(results[activeIndex]);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 bg-black/40 z-[100] flex items-start justify-center pt-24"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg mx-4 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-[#dde6f2] dark:border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2.5 px-4 py-3 border-b border-[#dde6f2] dark:border-slate-700">
          <Search size={16} className="text-[#94a3b8] flex-none" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search menu / customers / products / reports..."
            className="flex-1 bg-transparent outline-none border-0 text-[14px] text-[#111827] dark:text-slate-100 placeholder:text-[#94a3b8] font-[inherit]"
          />
          <kbd className="hidden md:inline-block text-[11px] text-[#94a3b8] border border-[#dde6f2] dark:border-slate-700 rounded px-1.5 py-0.5">Esc</kbd>
        </div>
        <div className="max-h-80 overflow-y-auto py-1.5">
          {results.length === 0 && (
            <div className="px-4 py-6 text-center text-[13px] text-[#94a3b8]">No matches</div>
          )}
          {results.map((command, index) => (
            <button
              key={`${command.section}-${command.label}`}
              type="button"
              onClick={() => go(command)}
              onMouseEnter={() => setActiveIndex(index)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-2 text-left text-[13px] cursor-pointer border-0 bg-transparent font-[inherit]
                ${index === activeIndex ? 'bg-blue-50 dark:bg-slate-800 text-blue-700 dark:text-blue-300' : 'text-[#111827] dark:text-slate-100'}`}
            >
              <span className="truncate">{command.label}</span>
              <span className="text-[11px] text-[#94a3b8] flex-none">{command.section}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

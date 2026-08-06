import { useEffect, useState } from 'react';
import { Delete, X } from 'lucide-react';

const KEYS = [
  ['7', '8', '9', '÷'],
  ['4', '5', '6', '×'],
  ['1', '2', '3', '−'],
  ['0', '.', '=', '+'],
];

function evaluate(expression) {
  const sanitized = expression.replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  if (!/^[0-9+\-*/.\s]*$/.test(sanitized)) return null;
  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${sanitized || '0'})`)();
    return Number.isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

const KEY_TO_OPERATOR = { '*': '×', '/': '÷', '-': '−' };

function isTypingElsewhere(el) {
  if (!el) return false;
  const tag = el.tagName;
  return (tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable) && !el.closest('.calculator-popup');
}

export function CalculatorPopup({ onClose }) {
  const [expression, setExpression] = useState('');

  function press(key) {
    if (key === '=') {
      const result = evaluate(expression);
      setExpression(result == null ? 'Error' : String(result));
      return;
    }
    setExpression((prev) => (prev === 'Error' ? key : prev + key));
  }

  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); return; }
      if (isTypingElsewhere(document.activeElement)) return;

      if (/^[0-9.]$/.test(e.key)) {
        e.preventDefault();
        press(e.key);
        return;
      }
      if (KEY_TO_OPERATOR[e.key]) {
        e.preventDefault();
        press(KEY_TO_OPERATOR[e.key]);
        return;
      }
      if (e.key === '+') {
        e.preventDefault();
        press('+');
        return;
      }
      if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        press('=');
        return;
      }
      if (e.key === 'Backspace') {
        e.preventDefault();
        setExpression((prev) => prev.slice(0, -1));
        return;
      }
      if (e.key.toLowerCase() === 'c') {
        e.preventDefault();
        setExpression('');
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, expression]);

  const preview = expression && expression !== 'Error' ? evaluate(expression) : null;

  return (
    <div className="fixed inset-0 bg-black/40 z-[100] flex items-start justify-end p-6" onClick={onClose}>
      <div
        className="calculator-popup w-64 bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-[#dde6f2] dark:border-slate-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-3.5 py-2.5 border-b border-[#dde6f2] dark:border-slate-700">
          <span className="text-[12px] font-semibold text-[#536173] dark:text-slate-400">Calculator</span>
          <button type="button" onClick={onClose} className="cursor-pointer bg-transparent border-0 text-[#94a3b8] flex items-center" aria-label="Close calculator">
            <X size={15} />
          </button>
        </div>
        <div className="px-3.5 py-3 bg-[#f8fafc] dark:bg-slate-800">
          <div className="text-right text-[11px] text-[#94a3b8] h-4 truncate">{preview != null ? `= ${preview}` : ' '}</div>
          <div className="text-right text-[22px] font-semibold text-[#111827] dark:text-slate-100 truncate">{expression || '0'}</div>
        </div>
        <div className="grid grid-cols-4 gap-1.5 p-2.5">
          <button
            type="button"
            onClick={() => setExpression('')}
            className="col-span-3 py-2.5 rounded-md bg-[#f1f5f9] dark:bg-slate-800 text-[13px] font-semibold text-[#536173] dark:text-slate-300 cursor-pointer border-0 font-[inherit]"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={() => setExpression((prev) => prev.slice(0, -1))}
            className="py-2.5 rounded-md bg-[#f1f5f9] dark:bg-slate-800 text-[#536173] dark:text-slate-300 cursor-pointer border-0 flex items-center justify-center"
            aria-label="Backspace"
          >
            <Delete size={14} />
          </button>
          {KEYS.flat().map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => press(key)}
              className={`py-2.5 rounded-md text-[15px] font-medium cursor-pointer border-0 font-[inherit]
                ${'÷×−+='.includes(key) ? 'bg-blue-600 text-white' : 'bg-white dark:bg-slate-900 text-[#111827] dark:text-slate-100 border border-[#edf2f7] dark:border-slate-700'}`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

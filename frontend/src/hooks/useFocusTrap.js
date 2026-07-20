import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

// Traps Tab/Shift+Tab within the returned ref's subtree, auto-focuses the
// first focusable element (or `initialFocusRef` if given), binds Escape to
// `onClose`, and restores focus to whatever was focused before the modal
// opened once it unmounts.
export function useFocusTrap({ active = true, onClose, initialFocusRef } = {}) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined;

    const container = containerRef.current;
    const triggerElement = document.activeElement;

    function focusables() {
      return Array.from(container?.querySelectorAll(FOCUSABLE_SELECTOR) ?? []);
    }

    const toFocus = initialFocusRef?.current ?? focusables()[0];
    toFocus?.focus();

    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const els = focusables();
      if (els.length === 0) return;
      const first = els[0];
      const last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    }

    container?.addEventListener('keydown', handleKeyDown);
    return () => {
      container?.removeEventListener('keydown', handleKeyDown);
      triggerElement?.focus?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

  return containerRef;
}

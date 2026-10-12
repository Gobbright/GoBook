import { useEffect, useState } from 'react';

const TYPING_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

// Adds list/table-page keyboard nav: `focusKey` (default "/") focuses the
// search box, Arrow Up/Down move a highlighted row (works even while the
// search box has focus, so you can type then arrow into the results), Enter
// opens the highlighted row via `onOpen(index)`, and Escape clears the
// highlight (or blurs the search box). Pass `focusKey: null` to disable the
// focus-search shortcut (e.g. when a page already binds that key elsewhere).
export function useListKeyboardNav({ rowCount, onOpen, searchRef, focusKey = '/', enabled = true }) {
  const [rawIndex, setHighlightedIndex] = useState(-1);
  const isEnabled = Boolean(enabled) && rowCount > 0;
  // Derived rather than synced via effect, so a shrinking rowCount (e.g. from
  // filtering) clamps immediately without an extra render.
  const highlightedIndex = !isEnabled ? -1 : Math.min(rawIndex, rowCount - 1);

  useEffect(() => {
    if (!isEnabled) return undefined;

    function handleKeyDown(e) {
      // If any modal/dialog is currently active, ignore all list shortcuts
      if (
        document.querySelector('[role="dialog"]') ||
        document.querySelector('[aria-modal="true"]') ||
        document.querySelector('.fixed.inset-0')
      ) {
        return;
      }

      const target = document.activeElement;
      if (
        target?.closest?.('[role="dialog"]') ||
        target?.closest?.('[aria-modal="true"]') ||
        target?.closest?.('.fixed')
      ) {
        return;
      }

      const isSearchFocused = Boolean(searchRef?.current) && target === searchRef.current;
      const isTyping = TYPING_TAGS.has(target?.tagName) && !isSearchFocused;

      if (focusKey && e.key === focusKey && !isTyping && !isSearchFocused) {
        e.preventDefault();
        searchRef?.current?.focus();
        return;
      }

      if (isTyping) return;

      // Do not intercept Enter or Arrow keys if user is focused on interactive elements (buttons, links, dropdowns)
      if (target && (target.tagName === 'BUTTON' || target.tagName === 'A' || target.getAttribute?.('role') === 'button')) {
        return;
      }

      if (e.key === 'ArrowDown') {
        if (rowCount === 0) return;
        e.preventDefault();
        setHighlightedIndex(Math.min(highlightedIndex + 1, rowCount - 1));
      } else if (e.key === 'ArrowUp') {
        if (rowCount === 0) return;
        e.preventDefault();
        setHighlightedIndex(Math.max(highlightedIndex - 1, 0));
      } else if (e.key === 'Enter' && highlightedIndex >= 0 && highlightedIndex < rowCount) {
        e.preventDefault();
        onOpen(highlightedIndex);
      } else if (e.key === 'Escape') {
        if (isSearchFocused) searchRef.current.blur();
        setHighlightedIndex(-1);
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [rowCount, onOpen, highlightedIndex, searchRef, focusKey, isEnabled]);

  return { highlightedIndex, setHighlightedIndex };
}

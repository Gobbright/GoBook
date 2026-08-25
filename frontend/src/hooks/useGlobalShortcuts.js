import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

import { getSidebarSections } from '../constants/navigation.js';
import { useKeyboardMode } from '../app/KeyboardModeContext.jsx';
import { useCurrentUser } from './useCurrentUser.js';
import { normalizeAppPath } from '../routes/navigation.js';

const ALT_SHORTCUT_TITLES = {
  d: 'Dashboard',
  s: 'Sales & Bill',
  p: 'Purchase',
  i: 'Inventory',
  c: 'Customers',
  g: 'GST',
  r: 'Reports',
  t: 'Settings',
};

function isTypingTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export function useGlobalShortcuts({ onOpenPalette } = {}) {
  const navigate = useNavigate();
  const storedUser = useCurrentUser();
  const { keyboardMode } = useKeyboardMode();

  useEffect(() => {
    function handleKeyDown(e) {
      if (!keyboardMode) return;
      if (!e.altKey || e.ctrlKey || e.metaKey) return;

      const key = e.key.toLowerCase();

      if (key === 'q') {
        e.preventDefault();
        onOpenPalette?.();
        return;
      }

      const title = ALT_SHORTCUT_TITLES[key];
      if (!title) return;
      if (isTypingTarget(document.activeElement)) return;

      if (key === 't') {
        e.preventDefault();
        navigate('/business-settings');
        return;
      }

      const user = storedUser || {};
      const sections = getSidebarSections(user.category || 'other', user);
      const section = sections.find((s) => s.title === title);
      const href = section?.items?.[0]?.href;
      if (!href) return;

      e.preventDefault();
      navigate(normalizeAppPath(href));
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate, storedUser, onOpenPalette, keyboardMode]);
}

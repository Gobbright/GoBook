import { useState } from 'react';

import { AiAssistantWidget } from '../components/ai/AiAssistantWidget.jsx';
import { CommandPalette } from '../components/layout/CommandPalette.jsx';
import { MobileBottomNav } from '../components/layout/MobileBottomNav.jsx';
import { Sidebar } from '../components/layout/Sidebar.jsx';
import { Topbar } from '../components/layout/Topbar.jsx';
import { KeyboardModeProvider } from './KeyboardModeContext.jsx';
import { useGlobalShortcuts } from '../hooks/useGlobalShortcuts.js';
import { useCurrentUser } from '../hooks/useCurrentUser.js';

const SHORTCUT_HINTS = [
  ['Alt+Q', 'Search'],
  ['Alt+D', 'Dashboard'],
  ['Alt+S', 'Sales'],
  ['Alt+P', 'Purchase'],
  ['Alt+I', 'Inventory'],
  ['Alt+C', 'Customers'],
  ['Alt+G', 'GST'],
  ['Alt+R', 'Reports'],
  ['Alt+T', 'Business Settings'],
];

function ShortcutBar() {
  return (
    <div className="app-shortcut-bar" aria-label="Keyboard shortcuts">
      {SHORTCUT_HINTS.map(([shortcut, label]) => (
        <span key={shortcut}>
          <kbd>{shortcut}</kbd>
          {label}
        </span>
      ))}
    </div>
  );
}

function AppShellInner({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const currentUser = useCurrentUser();
  const category = currentUser?.category || 'other';

  useGlobalShortcuts({ onOpenPalette: () => setPaletteOpen(true) });

  return (
    <div className="app-shell flex h-dvh min-h-screen overflow-hidden" data-app-category={category}>
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="app-main flex-1 min-w-0 flex flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen((open) => !open)} onOpenSearch={() => setPaletteOpen(true)} />
        <div className="app-content flex-1 overflow-y-auto overflow-x-hidden">
          {children}
        </div>
      </main>
      <AiAssistantWidget />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <MobileBottomNav />
      <ShortcutBar />
    </div>
  );
}

export function AppShell({ children }) {
  return (
    <KeyboardModeProvider>
      <AppShellInner>{children}</AppShellInner>
    </KeyboardModeProvider>
  );
}

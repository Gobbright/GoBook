import { useState } from 'react';

import { AiAssistantWidget } from '../components/ai/AiAssistantWidget.jsx';
import { CommandPalette } from '../components/layout/CommandPalette.jsx';
import { MobileBottomNav } from '../components/layout/MobileBottomNav.jsx';
import { Sidebar } from '../components/layout/Sidebar.jsx';
import { Topbar } from '../components/layout/Topbar.jsx';
import { KeyboardModeProvider } from './KeyboardModeContext.jsx';
import { useGlobalShortcuts } from '../hooks/useGlobalShortcuts.js';

function AppShellInner({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);

  useGlobalShortcuts({ onOpenPalette: () => setPaletteOpen(true) });

  return (
    <div className="app-shell flex h-screen overflow-hidden">
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="app-main flex-1 min-w-0 flex flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen((open) => !open)} onOpenSearch={() => setPaletteOpen(true)} />
        <div className="app-content flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
      <AiAssistantWidget />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
      <MobileBottomNav />
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

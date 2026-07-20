import { useState } from 'react';

import { AiAssistantWidget } from '../components/ai/AiAssistantWidget.jsx';
import { Sidebar } from '../components/layout/Sidebar.jsx';
import { Topbar } from '../components/layout/Topbar.jsx';

export function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-shell flex h-screen overflow-hidden">
      <Sidebar mobileOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="app-main flex-1 min-w-0 flex flex-col overflow-hidden">
        <Topbar onMenuClick={() => setSidebarOpen((open) => !open)} />
        <div className="app-content flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
      <AiAssistantWidget />
    </div>
  );
}

import { useState } from 'react';
import { Sidebar } from './components/Sidebar.jsx';
import { logoutAdmin } from './adminService.js';

export function AdminLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 flex">
      {/* Fixed Sidebar - Always Visible on Desktop */}
      <div className="hidden lg:block fixed left-0 top-0 bottom-0 w-[280px]">
        <Sidebar open={true} onClose={() => {}} onLogout={logoutAdmin} />
      </div>

      {/* Mobile Sidebar - Hamburger */}
      <div className="lg:hidden">
        <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} onLogout={logoutAdmin} />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 lg:ml-[280px] min-h-screen">
        {children}
      </main>
    </div>
  );
}




import { useEffect, useState } from 'react';

import { api } from '../../services/api.js';
import { PlatformAdminBusinesses } from './PlatformAdminBusinesses.jsx';
import { PlatformAdminOverview } from './PlatformAdminOverview.jsx';
import { PlatformAdminSidebar } from './PlatformAdminSidebar.jsx';
import { PlatformAdminUsers } from './PlatformAdminUsers.jsx';

export function PlatformAdminPage() {
  const [status, setStatus] = useState('loading');
  const [view, setView] = useState('overview');
  const [stats, setStats] = useState(null);
  const [businesses, setBusinesses] = useState([]);
  const [users, setUsers] = useState([]);
  const [userSearch, setUserSearch] = useState('');

  useEffect(() => {
    Promise.all([api.platformStats(), api.platformBusinesses(), api.platformUsers('')])
      .then(([statsData, businessesData, usersData]) => {
        setStats(statsData);
        setBusinesses(businessesData.businesses ?? []);
        setUsers(usersData.users ?? []);
        setStatus('ready');
      })
      .catch(() => {
        // Not a platform owner (404), unauthenticated (already redirected to /login),
        // or a real error — either way, this area doesn't exist for this account.
        window.location.assign('/dashboard');
      });
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      api.platformUsers(userSearch).then((data) => setUsers(data.users ?? [])).catch(() => {});
    }, 250);
    return () => clearTimeout(timer);
  }, [userSearch]);

  if (status === 'loading') {
    return <div className="min-h-screen bg-slate-50 dark:bg-slate-950" />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950">
      <PlatformAdminSidebar view={view} onNavigate={setView} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="p-6 md:p-8 max-w-[1200px] mx-auto">
          {view === 'overview' && <PlatformAdminOverview stats={stats} businesses={businesses} />}
          {view === 'businesses' && <PlatformAdminBusinesses businesses={businesses} />}
          {view === 'users' && (
            <PlatformAdminUsers users={users} search={userSearch} onSearchChange={setUserSearch} />
          )}
        </div>
      </main>
    </div>
  );
}

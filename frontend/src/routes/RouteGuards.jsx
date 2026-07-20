import { useEffect } from 'react';
import { Navigate, Outlet as RouterOutlet, useLocation } from 'react-router-dom';

import { AppShell } from '../app/AppShell.jsx';
import { getCurrentUser, isAuthenticated } from '../services/authService.js';
import { AUTH_PATHS, getLastRoute, SESSION_KEY } from './routeStorage.js';

export function LegacyHashRedirect() {
  useEffect(() => {
    function normalizeHash() {
      const hash = window.location.hash;
      if (hash && hash !== '#' && !hash.startsWith('#/')) {
        window.location.hash = `/${hash.slice(1)}`;
      }
    }

    normalizeHash();
    window.addEventListener('hashchange', normalizeHash);
    return () => window.removeEventListener('hashchange', normalizeHash);
  }, []);

  return null;
}

export function RouteMemory() {
  const location = useLocation();

  useEffect(() => {
    const el = document.querySelector('main > div.overflow-y-auto');
    if (el) el.scrollTop = 0;

    if (!AUTH_PATHS.has(location.pathname)) {
      sessionStorage.setItem(SESSION_KEY, location.pathname);
    }
  }, [location.pathname]);

  return null;
}

export function PublicRoute({ children }) {
  return isAuthenticated() ? <Navigate to={getLastRoute()} replace /> : children;
}

export function ProtectedRoute({ children }) {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
}

export function ProtectedShell() {
  const location = useLocation();
  const user = getCurrentUser();

  if (user?.needsEmailVerification && location.pathname !== '/verify-email') {
    return <Navigate to="/verify-email" replace />;
  }
  if (user?.needsOnboarding && location.pathname !== '/google-onboarding') {
    return <Navigate to="/google-onboarding" replace />;
  }

  return (
    <ProtectedRoute>
      <AppShell>
        <RouteMemory />
        <RouterOutlet />
      </AppShell>
    </ProtectedRoute>
  );
}


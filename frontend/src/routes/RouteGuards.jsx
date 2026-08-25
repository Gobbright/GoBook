import { useEffect } from 'react';
import { Navigate, Outlet as RouterOutlet, useLocation, useNavigate } from 'react-router-dom';

import { AppShell } from '../app/AppShell.jsx';
import { canAccessPath } from '../constants/navigation.js';
import { AdminErrorBoundary } from '../features/admin/components/AdminErrorBoundary.jsx';
import { isAdminAuthenticated } from '../features/admin/adminService.js';
import { getCurrentUser, isAuthenticated } from '../services/authService.js';
import { AUTH_PATHS, getLastRoute, SESSION_KEY } from './routeStorage.js';


export function GlobalErrorReporter() {
  useEffect(() => {
    function reportError(event) {
      console.error('[GlobalRuntimeError]', event.error || event.message);
    }

    function reportRejection(event) {
      console.error('[GlobalUnhandledRejection]', event.reason);
    }

    window.addEventListener('error', reportError);
    window.addEventListener('unhandledrejection', reportRejection);
    return () => {
      window.removeEventListener('error', reportError);
      window.removeEventListener('unhandledrejection', reportRejection);
    };
  }, []);

  return null;
}
export function LegacyHashRedirect() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash || hash === '#') return;

    const nextPath = hash.startsWith('#/') ? hash.slice(1) : `/${hash.slice(1)}`;
    window.history.replaceState(null, '', nextPath || '/dashboard');
    navigate(nextPath || '/dashboard', { replace: true });
  }, [navigate]);

  useEffect(() => {
    if (location.pathname.length <= 1 || !location.pathname.endsWith('/')) return;
    navigate(`${location.pathname.replace(/\/+$/, '')}${location.search || ''}`, { replace: true });
  }, [location.pathname, location.search, navigate]);

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

export function AdminPublicRoute({ children }) {
  return isAdminAuthenticated() ? <Navigate to="/admin" replace /> : children;
}

export function AdminProtectedRoute({ children }) {
  return isAdminAuthenticated()
    ? <AdminErrorBoundary>{children}</AdminErrorBoundary>
    : <Navigate to="/admin-login" replace />;
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
  if (user && !canAccessPath(location.pathname, user)) {
    return <Navigate to="/dashboard" replace />;
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


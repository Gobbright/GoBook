import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

import { LoginPage } from '../features/auth/LoginPage.jsx';
import { RegisterPage } from '../features/auth/RegisterPage.jsx';
import { PublicRoute } from './RouteGuards.jsx';

const FullAppRoutes = lazy(() => import('./AppRouter.jsx').then(({ FullAppRoutes: Component }) => ({ default: Component })));

function AppLoading() {
  return <main className="min-h-dvh bg-slate-50" aria-busy="true" />;
}

export function PublicEntryRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
        <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
        <Route path="*" element={<Suspense fallback={<AppLoading />}><FullAppRoutes /></Suspense>} />
      </Routes>
    </BrowserRouter>
  );
}

import { readFile } from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const [sidebar, router] = await Promise.all([
  readFile(path.join(root, 'src/features/admin/components/Sidebar.jsx'), 'utf8'),
  readFile(path.join(root, 'src/routes/AppRouter.jsx'), 'utf8'),
]);

const sidebarPaths = [...new Set([...sidebar.matchAll(/['"](\/admin(?:\/[^'"]*)?)['"]/g)].map((match) => match[1]).filter((value) => !value.includes('*') && !value.endsWith('/')))];
const routePaths = [...router.matchAll(/<Route\s+path="(\/admin[^"]*)"/g)].map((match) => match[1]);
const routeSet = new Set(routePaths);
const missing = sidebarPaths.filter((route) => !routeSet.has(route));
const duplicates = [...new Set(routePaths.filter((route, index) => routePaths.indexOf(route) !== index))];
const storageRoutes = sidebarPaths.filter((route) => route.startsWith('/admin/storage/'));
const userDetailRoutes = sidebarPaths.filter((route) => route.startsWith('/admin/user-details/'));

if (missing.length || duplicates.length || storageRoutes.length !== 5 || userDetailRoutes.length !== 3) {
  console.error(JSON.stringify({ ok: false, missing, duplicateRoutes: duplicates, storageRoutes, userDetailRoutes }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, sidebarRoutesChecked: sidebarPaths.length, appRoutesChecked: routePaths.length, duplicateRoutes: 0, userManagementDetailRoutes: userDetailRoutes, storageSubNavigation: storageRoutes }, null, 2));

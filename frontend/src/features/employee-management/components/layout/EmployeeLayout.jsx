import { Sidebar } from './Sidebar.jsx';
import { Topbar } from './Topbar.jsx';

export function EmployeeLayout({ children }) {
  return <div className="app-shell"><Sidebar /><main className="main"><Topbar /><section className="content">{children}</section></main></div>;
}
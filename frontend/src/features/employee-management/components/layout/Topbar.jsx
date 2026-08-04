import { Menu } from 'lucide-react';
import { useAuth } from '../../context/AuthContext.jsx';

export function Topbar() {
  const { user } = useAuth();
  return (
    <header className="topbar">
      <button className="btn menu-button" type="button" aria-label="Menu"><Menu size={17} /></button>
      <div className="topbar-title">
        <strong>Employee Portal</strong>
        <span>GoBook workforce workspace</span>
      </div>
      <div className="topbar-spacer" />
      <div className="profile-chip"><strong>{user?.name}</strong><span>{user?.role}</span></div>
    </header>
  );
}

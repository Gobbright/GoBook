import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { authService } from '../services/authService.js';

const AuthContext = createContext(null);

function readStoredUser() {
  try {
    return JSON.parse(localStorage.getItem('employee_portal_user') || 'null');
  } catch {
    localStorage.removeItem('employee_portal_user');
    return null;
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(readStoredUser);
  const [loading, setLoading] = useState(Boolean(localStorage.getItem('employee_portal_token')));

  useEffect(() => {
    if (!localStorage.getItem('employee_portal_token')) {
      setLoading(false);
      return;
    }
    authService.me()
      .then((data) => {
        const nextUser = data.user;
        setUser(nextUser);
        localStorage.setItem('employee_portal_user', JSON.stringify(nextUser));
      })
      .catch(() => logout())
      .finally(() => setLoading(false));
  }, []);

  async function login(payload) {
    setLoading(true);
    try {
      const data = await authService.login(payload);
      localStorage.setItem('employee_portal_token', data.token);
      localStorage.setItem('employee_portal_user', JSON.stringify(data.user));
      setUser(data.user);
      return data.user;
    } finally {
      setLoading(false);
    }
  }

  function logout() {
    localStorage.removeItem('employee_portal_token');
    localStorage.removeItem('employee_portal_user');
    setUser(null);
    setLoading(false);
  }

  const value = useMemo(() => ({ user, loading, login, logout, isAdmin: user?.role === 'admin' || user?.role === 'hr' }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}

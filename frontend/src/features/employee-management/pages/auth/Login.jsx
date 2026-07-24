import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { authService } from '../../services/authService.js';

export default function Login() {
  const { user, loading: authLoading, login, isAdmin, logout } = useAuth();
  const [params] = useSearchParams();
  const [form, setForm] = useState({ email: params.get('employeeId') || '', password: '', ownerUserId: params.get('ownerUserId') || '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [ssoLoading, setSsoLoading] = useState(Boolean(params.get('token')));
  const navigate = useNavigate();

  useEffect(() => {
    if (user && isAdmin) logout();
  }, [user, isAdmin, logout]);

  useEffect(() => {
    const token = params.get('token');
    if (!token) return;

    authService.exchangeMain(token)
      .then((data) => {
        localStorage.setItem('employee_portal_token', data.token);
        localStorage.setItem('employee_portal_user', JSON.stringify(data.user));
        const target = params.get('target') || '/employee-management/dashboard';
        window.location.replace(target.startsWith('/employee-management/') ? target : '/employee-management/dashboard');
      })
      .catch((err) => {
        setError(err.message);
        setSsoLoading(false);
      });
  }, [params]);

  if (authLoading) return <main className="login-page"><div className="card login-card">Loading...</div></main>;
  if (user && !isAdmin) return <Navigate to="/employee/dashboard" replace />;

  async function submit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const nextUser = await login({ ...form, employeeId: form.email });
      if (nextUser.role !== 'employee') throw new Error('Use the admin login to access Employee Management');
      navigate('/employee/dashboard', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (ssoLoading) {
    return (
      <main className="login-page">
        <div className="card login-card">
          <img src="/gobook-logo-full.png" alt="GoBook" style={{ width: 160, marginBottom: 16 }} />
          <h1 style={{ margin: 0 }}>Opening Employee Management</h1>
          <p style={{ color: '#64748b' }}>Signing you in from GoBook...</p>
          {error && <p className="error">{error}</p>}
        </div>
      </main>
    );
  }

  return (
    <main className="login-page">
      <form className="card login-card" onSubmit={submit}>
        <img src="/gobook-logo-full.png" alt="GoBook" style={{ width: 160, marginBottom: 16 }} />
        <h1 style={{ margin: 0 }}>Employee Login</h1>
        <p style={{ color: '#64748b' }}>Employees can sign in with their login credentials</p>
        {error && <p className="error">{error}</p>}
        <div className="field"><label>Employee ID / Email</label><input type="text" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
        <div className="field" style={{ marginTop: 12 }}><label>Password</label><input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /></div>
        <button className="btn primary" style={{ width: '100%', justifyContent: 'center', marginTop: 18 }} disabled={loading}>{loading ? 'Signing in...' : 'Login'}</button>
      </form>
    </main>
  );
}

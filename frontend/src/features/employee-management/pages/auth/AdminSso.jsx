import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { authService } from '../../services/authService.js';

export default function AdminSso() {
  const [params] = useSearchParams();
  const [error, setError] = useState('');

  useEffect(() => {
    const token = params.get('token');
    if (!token) {
      setError('Main GoBook login token missing. Open Employee Management from the main dashboard.');
      return;
    }

    authService.exchangeMain(token)
      .then((data) => {
        localStorage.setItem('employee_portal_token', data.token);
        localStorage.setItem('employee_portal_user', JSON.stringify(data.user));
        const target = params.get('target') || '/employee-management/dashboard';
        window.location.replace(target.startsWith('/employee-management/') ? target : '/employee-management/dashboard');
      })
      .catch((err) => setError(err.message));
  }, [params]);

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

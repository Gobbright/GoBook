import { useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { attendanceService } from '../../services/attendanceService.js';

export default function CorrectionRequest() {
  const [form, setForm] = useState({ date: '', checkIn: '', checkOut: '', reason: '' });
  const [message, setMessage] = useState('');
  async function submit(e) { e.preventDefault(); setMessage(''); if (!form.date || !form.reason) return setMessage('Date and reason are required'); try { await attendanceService.correction(form); setMessage('Correction request submitted'); setForm({ date: '', checkIn: '', checkOut: '', reason: '' }); } catch (err) { setMessage(err.message); } }
  return <><PageHeader title="Correction Request" subtitle="Request attendance correction" />{message && <p className={message.includes('submitted') ? 'card' : 'error'}>{message}</p>}<form className="card form-grid" onSubmit={submit}><div className="field"><label>Date</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div><div className="field"><label>Check In</label><input type="time" value={form.checkIn} onChange={(e) => setForm({ ...form, checkIn: e.target.value })} /></div><div className="field"><label>Check Out</label><input type="time" value={form.checkOut} onChange={(e) => setForm({ ...form, checkOut: e.target.value })} /></div><div className="field"><label>Reason</label><input value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div><button className="btn primary">Submit Request</button></form></>;
}

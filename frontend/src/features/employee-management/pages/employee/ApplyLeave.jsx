import { useState } from 'react';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { leaveService } from '../../services/leaveService.js';

export default function ApplyLeave() {
  const [form, setForm] = useState({ type: 'Casual Leave', from: '', to: '', days: 1, reason: '' });
  const [message, setMessage] = useState('');
  async function submit(e) { e.preventDefault(); setMessage(''); if (!form.from || !form.to) return setMessage('From and to dates are required'); try { await leaveService.apply(form); setMessage('Leave request submitted'); setForm({ type: 'Casual Leave', from: '', to: '', days: 1, reason: '' }); } catch (err) { setMessage(err.message); } }
  return <><PageHeader title="Apply Leave" subtitle="Submit your leave request" />{message && <p className={message.includes('submitted') ? 'card' : 'error'}>{message}</p>}<form className="card form-grid" onSubmit={submit}><div className="field"><label>Leave Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>Casual Leave</option><option>Sick Leave</option><option>Annual Leave</option><option>Unpaid Leave</option><option>Comp Off</option></select></div><div className="field"><label>Days</label><input type="number" min="1" value={form.days} onChange={(e) => setForm({ ...form, days: Number(e.target.value) })} /></div><div className="field"><label>From</label><input type="date" value={form.from} onChange={(e) => setForm({ ...form, from: e.target.value })} /></div><div className="field"><label>To</label><input type="date" value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} /></div><div className="field field-full"><label>Reason</label><textarea rows="4" value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} /></div><button className="btn primary">Apply Leave</button></form></>;
}

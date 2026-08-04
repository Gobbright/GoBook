import { useState } from 'react';
import { PageHeader } from '../../../components/common/PageHeader.jsx';
import { holidayService } from '../../../services/holidayService.js';

export default function AddHoliday() {
  const [form, setForm] = useState({ name: '', date: '', type: 'Company', description: '' });
  const [message, setMessage] = useState('');
  async function submit(e) { e.preventDefault(); setMessage(''); if (!form.name || !form.date) return setMessage('Holiday name and date are required'); try { await holidayService.create(form); setMessage('Holiday saved'); setForm({ name: '', date: '', type: 'Company', description: '' }); } catch (err) { setMessage(err.message); } }
  return <><PageHeader title="Add Holiday" subtitle="Create a holiday record" />{message && <p className={message.includes('saved') ? 'card' : 'error'}>{message}</p>}<form className="card form-grid" onSubmit={submit}><div className="field"><label>Name</label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div><div className="field"><label>Date</label><input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div><div className="field"><label>Type</label><select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}><option>Company</option><option>Public</option><option>Optional</option></select></div><div className="field"><label>Description</label><input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div><button className="btn primary">Save Holiday</button></form></>;
}

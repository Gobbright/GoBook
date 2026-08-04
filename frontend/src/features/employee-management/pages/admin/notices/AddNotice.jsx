import { useState } from 'react';
import { Send } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PageHeader } from '../../../components/common/PageHeader.jsx';
import { noticeService } from '../../../services/noticeService.js';

export default function AddNotice() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ title: '', message: '' });
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    if (!form.title.trim() || !form.message.trim()) {
      setError('Title and message are required');
      return;
    }
    setSending(true);
    try {
      await noticeService.create({ title: form.title.trim(), message: form.message.trim() });
      navigate('/employee-management/notices', { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <PageHeader title="Send Notice" subtitle="Publish an announcement to all employees" />
      {error && <p className="error">{error}</p>}
      <form className="card form-grid" onSubmit={submit}>
        <div className="field field-full"><label htmlFor="notice-title">Title</label><input id="notice-title" value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} maxLength="160" required /></div>
        <div className="field field-full"><label htmlFor="notice-message">Message</label><textarea id="notice-message" rows="6" value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} required /></div>
        <div className="field-full employee-modal-actions"><button className="btn" type="button" onClick={() => navigate('/employee-management/notices')}>Cancel</button><button className="btn primary" type="submit" disabled={sending}><Send size={15} />{sending ? 'Sending...' : 'Send Notice'}</button></div>
      </form>
    </>
  );
}
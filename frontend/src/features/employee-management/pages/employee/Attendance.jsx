import { useMemo, useState } from 'react';
import { CheckCircle2, Clock, LogIn, LogOut, MapPin, X } from 'lucide-react';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { useLoad } from '../../hooks/useLoad.js';
import { attendanceService } from '../../services/attendanceService.js';

function localDateValue() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

function getLiveLocation() {
  if (!navigator.geolocation) throw new Error('Live location is not supported in this browser');
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (position) => resolve({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        capturedAt: new Date().toISOString(),
      }),
      () => reject(new Error('Allow live location permission to mark attendance')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  });
}

function hasTime(value) {
  return Boolean(value && value !== '--');
}

function locationText(location) {
  if (!location?.latitude || !location?.longitude) return '-';
  return location.address
    || [location.street, location.area, location.city, location.district].filter(Boolean).join(', ')
    || `${Number(location.latitude).toFixed(5)}, ${Number(location.longitude).toFixed(5)}`;
}

function LocationView({ location }) {
  if (!location?.latitude || !location?.longitude) return <span>-</span>;
  return <a className="location-link" href={location.mapUrl || `https://www.google.com/maps?q=${location.latitude},${location.longitude}`} target="_blank" rel="noreferrer">{locationText(location)}</a>;
}

function AttendanceConfirmModal({ pending, saving, onClose, onConfirm }) {
  return (
    <div className="employee-modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <section className="employee-modal attendance-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="attendance-confirm-title">
        <div className="employee-modal-head">
          <div>
            <h2 id="attendance-confirm-title">Confirm {pending.label}</h2>
            <p>Attendance will be saved with your live location.</p>
          </div>
          <button className="icon-btn" type="button" onClick={onClose} title="Close"><X size={17} /></button>
        </div>
        <div className="attendance-confirm-details">
          <div><Clock size={16} /><span>Time</span><strong>{new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: false })}</strong></div>
          <div><MapPin size={16} /><span>Location</span><strong>{locationText(pending.location)}</strong></div>
        </div>
        <div className="employee-modal-actions">
          <button className="btn" type="button" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="btn primary" type="button" onClick={onConfirm} disabled={saving}>{saving ? 'Saving...' : `Confirm ${pending.label}`}</button>
        </div>
      </section>
    </div>
  );
}

export default function Attendance() {
  const today = localDateValue();
  const month = today.slice(0, 7);
  const { data, loading, error, setData } = useLoad(() => attendanceService.monthly(month), [month]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState('');
  const [pending, setPending] = useState(null);

  const todayRecord = useMemo(
    () => (data?.data || []).find((record) => record.date === today) || null,
    [data, today],
  );
  const checkedIn = hasTime(todayRecord?.checkIn);
  const checkedOut = hasTime(todayRecord?.checkOut);

  async function openConfirm(fn, label) {
    setMessage('');
    setSaving(`Getting ${label}`);
    try {
      const location = await getLiveLocation();
      setPending({ fn, label, location });
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving('');
    }
  }

  async function confirmAction() {
    if (!pending) return;
    setMessage('');
    setSaving(pending.label);
    try {
      const record = await pending.fn({ location: pending.location });
      setData((current) => {
        const rows = current?.data || [];
        const exists = rows.some((item) => item._id === record._id || item.date === record.date);
        return {
          ...(current || {}),
          data: exists
            ? rows.map((item) => (item._id === record._id || item.date === record.date ? record : item))
            : [record, ...rows],
        };
      });
      setMessage(`${pending.label} saved at ${pending.label === 'Check In' ? record.checkIn : record.checkOut}`);
      setPending(null);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving('');
    }
  }

  return (
    <>
      <PageHeader title="Check In / Check Out" subtitle="Mark your own attendance" />
      {error && <p className="error">{error}</p>}
      <section className="card attendance-status-card">
        <div className="attendance-status-head">
          <div>
            <span>Today</span>
            <strong>{today}</strong>
          </div>
          <b className={checkedOut ? 'complete' : checkedIn ? 'active' : ''}>{checkedOut ? 'Completed' : checkedIn ? 'Checked In' : 'Not Marked'}</b>
        </div>
        <div className="attendance-punch-grid">
          <div>
            <span><LogIn size={15} />Check In</span>
            <strong>{loading ? '...' : todayRecord?.checkIn || '--'}</strong>
            <LocationView location={todayRecord?.checkInLocation} />
          </div>
          <div>
            <span><LogOut size={15} />Check Out</span>
            <strong>{loading ? '...' : todayRecord?.checkOut || '--'}</strong>
            <LocationView location={todayRecord?.checkOutLocation} />
          </div>
        </div>
      </section>

      <div className="card action-panel attendance-action-panel">
        {!loading && !checkedIn && <button className="btn primary" disabled={Boolean(saving)} onClick={() => openConfirm(attendanceService.checkIn, 'Check In')}><LogIn size={16} />{saving === 'Getting Check In' ? 'Getting location...' : 'Check In'}</button>}
        {!loading && checkedIn && !checkedOut && <button className="btn primary" disabled={Boolean(saving)} onClick={() => openConfirm(attendanceService.checkOut, 'Check Out')}><LogOut size={16} />{saving === 'Getting Check Out' ? 'Getting location...' : 'Check Out'}</button>}
        {!loading && checkedIn && checkedOut && <div className="attendance-complete-note"><CheckCircle2 size={17} />Today attendance completed. Next check in opens tomorrow.</div>}
        {loading && <div className="attendance-complete-note">Loading today attendance...</div>}
      </div>

      {message && <p className={message.includes('saved') ? 'card' : 'error'}>{message}</p>}
      {pending && <AttendanceConfirmModal pending={pending} saving={Boolean(saving) && !saving.startsWith('Getting')} onClose={() => setPending(null)} onConfirm={confirmAction} />}
    </>
  );
}
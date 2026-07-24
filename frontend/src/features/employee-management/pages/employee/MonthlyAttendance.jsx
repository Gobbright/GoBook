import { useState } from 'react';
import { DataTable } from '../../components/common/DataTable.jsx';
import { PageHeader } from '../../components/common/PageHeader.jsx';
import { useLoad } from '../../hooks/useLoad.js';
import { attendanceService } from '../../services/attendanceService.js';

function LocationCell({ location }) {
  if (!location?.latitude || !location?.longitude) return '-';
  const text = location.address || [location.street, location.area, location.city, location.district].filter(Boolean).join(', ') || `${Number(location.latitude).toFixed(5)}, ${Number(location.longitude).toFixed(5)}`;
  return <a className="location-link" href={location.mapUrl || `https://www.google.com/maps?q=${location.latitude},${location.longitude}`} target="_blank" rel="noreferrer">{text}</a>;
}

export default function MonthlyAttendance() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const { data, loading, error } = useLoad(() => attendanceService.monthly(month), [month]);
  const columns = [{ key: 'date', label: 'Date' }, { key: 'checkIn', label: 'Check In' }, { key: 'checkInLocation', label: 'In Location', render: (row) => <LocationCell location={row.checkInLocation} /> }, { key: 'checkOut', label: 'Check Out' }, { key: 'checkOutLocation', label: 'Out Location', render: (row) => <LocationCell location={row.checkOutLocation} /> }, { key: 'hours', label: 'Hours' }, { key: 'status', label: 'Status' }];
  return <><PageHeader title="Monthly Attendance" subtitle="Only your attendance is shown" action={<input type="month" value={month} onChange={(e) => setMonth(e.target.value)} />} />{error && <p className="error">{error}</p>}{loading ? <div className="card">Loading...</div> : <DataTable columns={columns} rows={data?.data || []} />}</>;
}

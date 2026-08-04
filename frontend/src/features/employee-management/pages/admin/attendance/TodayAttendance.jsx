import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, CalendarRange, ClipboardCheck } from 'lucide-react';
import { DataTable } from '../../../components/common/DataTable.jsx';
import { PageHeader } from '../../../components/common/PageHeader.jsx';
import { useLoad } from '../../../hooks/useLoad.js';
import { attendanceService } from '../../../services/attendanceService.js';

function LocationCell({ location }) {
  if (!location?.latitude || !location?.longitude) return '-';
  const text = location.address || [location.street, location.area, location.city, location.district].filter(Boolean).join(', ') || `${Number(location.latitude).toFixed(5)}, ${Number(location.longitude).toFixed(5)}`;
  return <a className="location-link" href={location.mapUrl || `https://www.google.com/maps?q=${location.latitude},${location.longitude}`} target="_blank" rel="noreferrer">{text}</a>;
}
function localDateValue() {
  const now = new Date();
  return new Date(now.getTime() - now.getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
}

export default function TodayAttendance({ initialMode = 'date' }) {
  const [mode, setMode] = useState(initialMode);
  const [date, setDate] = useState(localDateValue);
  const [month, setMonth] = useState(() => localDateValue().slice(0, 7));
  const filterValue = mode === 'month' ? month : date;
  const { data, loading, error } = useLoad(
    () => mode === 'month' ? attendanceService.adminMonthly(month) : attendanceService.adminDate(date),
    [mode, filterValue],
  );
  const columns = [
    { key: 'date', label: 'Date' },
    { key: 'employeeId', label: 'Employee ID' },
    { key: 'name', label: 'Name' },
    { key: 'dept', label: 'Department' },
    { key: 'checkIn', label: 'Check In' },
    { key: 'checkInLocation', label: 'In Location', render: (row) => <LocationCell location={row.checkInLocation} /> },
    { key: 'checkOut', label: 'Check Out' },
    { key: 'checkOutLocation', label: 'Out Location', render: (row) => <LocationCell location={row.checkOutLocation} /> },
    { key: 'hours', label: 'Hours' },
    { key: 'status', label: 'Status' },
  ];

  const filters = (
    <div className="page-actions-row attendance-filters">
      <div className="filter-segmented" aria-label="Attendance period">
        <button type="button" className={mode === 'date' ? 'active' : ''} onClick={() => setMode('date')}><CalendarDays size={15} />Date</button>
        <button type="button" className={mode === 'month' ? 'active' : ''} onClick={() => setMode('month')}><CalendarRange size={15} />Monthly</button>
      </div>
      {mode === 'date' ? (
        <input aria-label="Attendance date" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
      ) : (
        <input aria-label="Attendance month" type="month" value={month} onChange={(event) => setMonth(event.target.value)} />
      )}
      <Link className="btn" to="/employee-management/attendance/corrections"><ClipboardCheck size={15} />Corrections</Link>
    </div>
  );

  return (
    <>
      <PageHeader title="Attendance" subtitle={mode === 'month' ? `Monthly records for ${month}` : `Attendance records for ${date}`} action={filters} />
      {error && <p className="error">{error}</p>}
      {loading ? <div className="card">Loading...</div> : <DataTable columns={columns} rows={data?.data || []} empty="No attendance found for this period" />}
    </>
  );
}

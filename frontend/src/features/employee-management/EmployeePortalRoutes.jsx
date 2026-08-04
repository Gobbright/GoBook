import { Navigate, Route, Routes } from 'react-router-dom';

import { AuthProvider } from './context/AuthContext.jsx';
import { ProtectedRoute } from './components/ProtectedRoute.jsx';
import { EmployeeLayout } from './components/layout/EmployeeLayout.jsx';
import Login from './pages/auth/Login.jsx';
import EmployeeDashboard from './pages/employee/Dashboard.jsx';
import Attendance from './pages/employee/Attendance.jsx';
import EmployeeMonthlyAttendance from './pages/employee/MonthlyAttendance.jsx';
import CorrectionRequest from './pages/employee/CorrectionRequest.jsx';
import ApplyLeave from './pages/employee/ApplyLeave.jsx';
import LeaveStatus from './pages/employee/LeaveStatus.jsx';
import LeaveHistory from './pages/employee/LeaveHistory.jsx';
import Notices from './pages/employee/Notices.jsx';
import Payslips from './pages/employee/Payslips.jsx';
import Holidays from './pages/employee/Holidays.jsx';
import MyProfile from './pages/employee/MyProfile.jsx';

function EmployeeShell({ children }) {
  return (
    <ProtectedRoute roles={['employee']}>
      <EmployeeLayout>{children}</EmployeeLayout>
    </ProtectedRoute>
  );
}

export function EmployeeLoginRoute() {
  return (
    <AuthProvider>
      <div className="employee-portal">
        <Login />
      </div>
    </AuthProvider>
  );
}

export function EmployeePortalRoutes() {
  return (
    <AuthProvider>
      <div className="employee-portal">
        <Routes>
          <Route path="/" element={<Navigate to="/employee/dashboard" replace />} />
          <Route path="/dashboard" element={<EmployeeShell><EmployeeDashboard /></EmployeeShell>} />
          <Route path="/attendance" element={<EmployeeShell><Attendance /></EmployeeShell>} />
          <Route path="/attendance/monthly" element={<EmployeeShell><EmployeeMonthlyAttendance /></EmployeeShell>} />
          <Route path="/attendance/correction" element={<EmployeeShell><CorrectionRequest /></EmployeeShell>} />
          <Route path="/leave/apply" element={<EmployeeShell><ApplyLeave /></EmployeeShell>} />
          <Route path="/leave/status" element={<EmployeeShell><LeaveStatus /></EmployeeShell>} />
          <Route path="/leave/history" element={<EmployeeShell><LeaveHistory /></EmployeeShell>} />
          <Route path="/notices" element={<EmployeeShell><Notices /></EmployeeShell>} />
          <Route path="/payslips" element={<EmployeeShell><Payslips /></EmployeeShell>} />
          <Route path="/holidays" element={<EmployeeShell><Holidays /></EmployeeShell>} />
          <Route path="/profile" element={<EmployeeShell><MyProfile /></EmployeeShell>} />
          <Route path="*" element={<Navigate to="/employee/dashboard" replace />} />
        </Routes>
      </div>
    </AuthProvider>
  );
}

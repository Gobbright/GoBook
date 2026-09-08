function isAdminUser(user = {}) {
  return user.isPlatformOwner || ['Super Admin', 'Admin', 'Owner'].includes(user.role);
}

function isSuperAdminUser(user = {}) {
  return user.isSuperAdmin || user.accountType === 'owner' || user.role === 'Super Admin';
}

const SECTION_PERMISSION = {
  sales: 'billing',
  purchase: 'purchase',
  hospitalBilling: 'billing',
  hotelBilling: 'billing',
  financeBills: 'billing',
  inventory: 'inventory',
  accounting: 'accounting',
  gst: 'accounting',
  crm: 'crm',
  financeCustomers: 'crm',
  hrPayroll: 'employee-management',
  reports: 'reports',
  reportsHub: 'reports',
  hospitalReports: 'reports',
  hotelReports: 'reports',
  financeReports: 'reports',
  dataManagement: 'data-management',
  settings: 'settings',
  financeProfileSettings: 'settings',
  moreModules: 'marketing',
};

const ROUTE_PERMISSION_RULES = [
  [/^\/billing\/(purchase-order|purchase-entry|supplier-return)(\/|$)/, 'purchase'],
  [/^\/billing(\/|$)/, 'billing'],
  [/^\/sales-reports$/, 'reports'],
  [/^\/purchase-reports$/, 'reports'],
  [/^\/products$/, 'inventory'],
  [/^\/services$/, 'inventory'],
  [/^\/product-masters$/, 'inventory'],
  [/^\/product-categories$/, 'inventory'],
  [/^\/brands$/, 'inventory'],
  [/^\/warehouse$/, 'inventory'],
  [/^\/barcode$/, 'inventory'],
  [/^\/stock-/, 'inventory'],
  [/^\/inventory-reports$/, 'reports'],
  [/^\/vouchers$/, 'accounting'],
  [/^\/accounting-reports$/, 'reports'],
  [/^\/ledger$/, 'accounting'],
  [/^\/journal-entry$/, 'accounting'],
  [/^\/trial-balance$/, 'accounting'],
  [/^\/pnl$/, 'accounting'],
  [/^\/balance-sheet$/, 'accounting'],
  [/^\/cash-book$/, 'accounting'],
  [/^\/bank-book$/, 'accounting'],
  [/^\/bank-reconciliation$/, 'accounting'],
  [/^\/gst-reports$/, 'reports'],
  [/^\/gst-/, 'accounting'],
  [/^\/gstr-/, 'accounting'],
  [/^\/customers$/, 'crm'],
  [/^\/leads$/, 'crm'],
  [/^\/follow-ups$/, 'crm'],
  [/^\/customer-lifecycle$/, 'crm'],
  [/^\/crm-reports$/, 'reports'],
  [/^\/employee-management(\/|$)/, 'employee-management'],
  [/^\/hr-reports$/, 'reports'],
  [/^\/reports$/, 'reports'],
  [/^\/data-management(\/|$)/, 'data-management'],
  [/^\/multi-branch$/, 'settings'],
  [/^\/users-roles$/, 'settings'],
  [/^\/audit-report$/, 'settings'],
  [/^\/business-settings$/, 'settings'],
  [/^\/whatsapp-business$/, 'marketing'],
  [/^\/email-marketing$/, 'marketing'],
  [/^\/sales-management$/, 'marketing'],
  [/^\/vendor-management$/, 'marketing'],
];

function userModules(user = {}) {
  return Array.isArray(user.permissions?.modules) ? user.permissions.modules : [];
}

function canManageBranchUsers(user = {}) {
  return user.role === 'Branch Manager' && Boolean(user.branch);
}

export function hasModuleAccess(user = {}, moduleKey) {
  if (!moduleKey || isSuperAdminUser(user)) return true;
  if (moduleKey === 'settings' && canManageBranchUsers(user)) return true;
  return userModules(user).includes(moduleKey);
}

export function canAccessPath(path = '/', user = {}) {
  if (isSuperAdminUser(user)) return true;
  if (path === '/' || path === '/dashboard' || path === '/finance/dashboard') return true;
  if (path === '/users-roles') return canManageBranchUsers(user) || hasModuleAccess(user, 'settings');
  const rule = ROUTE_PERMISSION_RULES.find(([pattern]) => pattern.test(path));
  return rule ? hasModuleAccess(user, rule[1]) : true;
}

const SECTIONS = {
  main: {
    title: 'Dashboard',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    ],
  },  sales: {
    title: 'Sales & Bill',
    items: [
      { label: 'Bills', href: '/billing/invoice/new', icon: 'FileText' },
      { label: 'Quotation', href: '/billing/quotation/new', icon: 'ClipboardList' },
      { label: 'Sales Return', href: '/billing/sales-return/new', icon: 'ArrowRightLeft' },
      { label: 'Delivery Challan', href: '/billing/delivery-challan/new', icon: 'Truck' },
      { label: 'Credit Note', href: '/billing/credit-note/new', icon: 'FileMinus' },
      { label: 'Debit Note', href: '/billing/debit-note/new', icon: 'FilePlus' },
      { label: 'E-Invoice', href: '/billing/e-invoice/new', icon: 'Zap' },
      { label: 'E-Way Bill', href: '/billing/e-way-bill/new', icon: 'Route' },
      { label: 'Receivables', href: '/billing/receivables', icon: 'IndianRupee' },
    ],
  },
  purchase: {
    title: 'Purchase',
    items: [
      { label: 'Purchase Order', href: '/billing/purchase-order/new', icon: 'ShoppingCart' },
      { label: 'Purchase Entry', href: '/billing/purchase-entry/new', icon: 'FileCheck' },
      { label: 'Supplier Returns', href: '/billing/supplier-return/new', icon: 'ArrowRightLeft' },
    ],
  },  gst: {
    title: 'GST',
    items: [
      { label: 'GST Dashboard', href: '/gst-dashboard', icon: 'PieChart' },
      { label: 'GSTR-1', href: '/gstr-1', icon: 'FileText' },
      { label: 'GSTR-3B', href: '/gstr-3b', icon: 'FileSpreadsheet' },
      { label: 'GSTR-9', href: '/gstr-9', icon: 'FileCheck' },
      { label: 'GST Reconciliation', href: '/gst-reconciliation', icon: 'RefreshCw' },
    ],
  },
  accounting: {
    title: 'Accounting',
    items: [
      { label: 'Vouchers', href: '/vouchers', icon: 'ReceiptText' },
      { label: 'Ledger', href: '/ledger', icon: 'BookOpen' },
      { label: 'Journal Entry', href: '/journal-entry', icon: 'PenLine' },
      { label: 'Trial Balance', href: '/trial-balance', icon: 'Scale' },
      { label: 'P&L Statement', href: '/pnl', icon: 'TrendingUp' },
      { label: 'Balance Sheet', href: '/balance-sheet', icon: 'LayoutGrid' },
      { label: 'Cash Book', href: '/cash-book', icon: 'Wallet' },
      { label: 'Bank Book', href: '/bank-book', icon: 'Building2' },
      { label: 'Bank Reconciliation', href: '/bank-reconciliation', icon: 'RefreshCw' },
    ],
  },
  crm: {
    title: 'Customers',
    items: [
      { label: 'Customers', href: '/customers', icon: 'Users' },
      { label: 'Leads', href: '/leads', icon: 'UserPlus' },
      { label: 'Follow Ups', href: '/follow-ups', icon: 'Bell' },
      { label: 'Customer Lifecycle', href: '/customer-lifecycle', icon: 'Activity' },
    ],
  },  inventory: {
    title: 'Inventory',
    items: [
      { label: 'Products', href: '/products', icon: 'Package' },
      { label: 'Services', href: '/services', icon: 'Wrench' },
      { label: 'Product Masters', href: '/product-masters', icon: 'Grid3x3' },
      { label: 'Warehouse', href: '/warehouse', icon: 'Warehouse' },
      { label: 'Barcode', href: '/barcode', icon: 'QrCode' },
      { label: 'Stock Summary', href: '/stock-summary', icon: 'BarChart3' },
      { label: 'Stock Ledger', href: '/stock-ledger', icon: 'BookOpen' },
      { label: 'Stock In', href: '/stock-in', icon: 'PackagePlus' },
      { label: 'Stock Out', href: '/stock-out', icon: 'PackageMinus' },
      { label: 'Stock Alerts', href: '/stock-alerts', icon: 'AlertTriangle' },
    ],
  },  hrPayroll: {
    title: 'Employee Management',
    forceGroup: true,
    items: [
      { label: 'Dashboard', href: '/employee-management/dashboard', icon: 'LayoutDashboard' },
      { label: 'Employees', href: '/employee-management/employees', icon: 'Users' },
      { label: 'Attendance', href: '/employee-management/attendance', icon: 'CalendarCheck' },
      { label: 'Leave', href: '/employee-management/leave', icon: 'CalendarOff' },
      { label: 'Payroll', href: '/employee-management/payroll', icon: 'IndianRupee' },
      { label: 'Notices', href: '/employee-management/notices', icon: 'Bell' },
    ],
  },  moreModules: {
    title: 'Marketing',
    items: [
      { label: 'WhatsApp Business', href: '/whatsapp-business', icon: 'MessageCircle' },
      { label: 'Email Marketing', href: '/email-marketing', icon: 'Mail' },
      { label: 'Sales Management', href: '/sales-management', icon: 'TrendingUp' },
      { label: 'Vendor Management', href: '/vendor-management', icon: 'UserCheck' },
    ],
  },
  dataManagement: {
    title: 'Data Management',
    items: [
      { label: 'Export Data', href: '/data-management/export', icon: 'Database' },
      { label: 'Import Data', href: '/data-management/import', icon: 'PackagePlus' },
      { label: 'Delete Period', href: '/data-management/delete-period', icon: 'CalendarOff' },
    ],
  },
  reports: {
    title: 'Reports',
    items: [
      { label: 'Reports', href: '/reports', icon: 'BarChart2' },
      { label: 'Sales Reports', href: '/sales-reports', icon: 'BarChart3' },
      { label: 'Purchase Reports', href: '/purchase-reports', icon: 'BarChart3' },
      { label: 'Inventory Reports', href: '/inventory-reports', icon: 'BarChart3' },
      { label: 'CRM Reports', href: '/crm-reports', icon: 'BarChart3' },
      { label: 'HR Reports', href: '/hr-reports', icon: 'BarChart3' },
      { label: 'Accounting Reports', href: '/accounting-reports', icon: 'BarChart3' },
      { label: 'GST Reports', href: '/gst-reports', icon: 'BarChart3' },
    ],
  },
  reportsHub: {
    title: 'Reports',
    items: [
      { label: 'Reports Hub', href: '/reports', icon: 'BarChart2' },
    ],
  },
  settings: {
    title: 'Settings',
    items: [
      { label: 'Multi Branch', href: '/multi-branch', icon: 'GitBranch' },
      { label: 'Users & Roles', href: '/users-roles', icon: 'Shield' },
      { label: 'Audit Report', href: '/audit-report', icon: 'History' },
      { label: 'Business Settings', href: '/business-settings', icon: 'Settings' },
    ],
  },

  // --- Hospital ---
  hospitalPatients: {
    title: 'Patients',
    items: [
      { label: 'Patient Registration', href: '/hospital/patient-registration', icon: 'UserPlus' },
      { label: 'Patient List', href: '/hospital/patients', icon: 'UserRound' },
      { label: 'Medical History', href: '/hospital/medical-history', icon: 'FolderOpen' },
      { label: 'Documents', href: '/hospital/patient-documents', icon: 'FolderOpen' },
      { label: 'Insurance', href: '/hospital/insurance-details', icon: 'FileCheck' },
    ],
  },
  hospitalAppointments: {
    title: 'Appointments',
    items: [
      { label: 'Book Appointment', href: '/hospital/book-appointment', icon: 'CalendarCheck' },
      { label: 'Appointment List', href: '/hospital/appointments', icon: 'ClipboardList' },
      { label: 'Calendar', href: '/hospital/appointment-calendar', icon: 'CalendarClock' },
      { label: 'Doctor Schedule', href: '/hospital/doctor-schedule', icon: 'Stethoscope' },
      { label: 'Queue & Token', href: '/hospital/queue-token', icon: 'ReceiptText' },
    ],
  },
  hospitalOpd: {
    title: 'OPD',
    items: [
      { label: 'Consultation', href: '/hospital/consultation', icon: 'Activity' },
      { label: 'Diagnosis', href: '/hospital/diagnosis', icon: 'FileText' },
      { label: 'Prescription', href: '/hospital/prescription', icon: 'FileText' },
      { label: 'Procedures', href: '/hospital/procedures', icon: 'HeartPulse' },
      { label: 'Follow-up', href: '/hospital/follow-up', icon: 'Bell' },
    ],
  },
  hospitalIpdBeds: {
    title: 'IPD & Beds',
    items: [
      { label: 'Admission', href: '/hospital/admission', icon: 'ClipboardList' },
      { label: 'Inpatients', href: '/hospital/inpatients', icon: 'Users' },
      { label: 'Ward & Rooms', href: '/hospital/ward-room-bed', icon: 'BedDouble' },
      { label: 'Bed Allocation', href: '/hospital/bed-allocation', icon: 'BedDouble' },
      { label: 'Transfer', href: '/hospital/transfer', icon: 'ArrowRightLeft' },
      { label: 'Discharge', href: '/hospital/discharge', icon: 'FileCheck' },
    ],
  },
  hospitalDoctorsNursing: {
    title: 'Doctors & Nursing',
    items: [
      { label: 'Doctors', href: '/hospital/doctors', icon: 'Stethoscope' },
      { label: 'Departments', href: '/hospital/departments', icon: 'Building2' },
      { label: 'Doctor Schedule', href: '/hospital/doctor-schedule-management', icon: 'CalendarClock' },
      { label: 'Nurses', href: '/hospital/nurse-list', icon: 'Users' },
      { label: 'Shift Allocation', href: '/hospital/shift-allocation', icon: 'CalendarClock' },
      { label: 'Patient Assignment', href: '/hospital/patient-assignment', icon: 'UserCheck' },
    ],
  },
  hospitalDiagnostics: {
    title: 'Diagnostics',
    items: [
      { label: 'Laboratory', href: '/hospital/diagnostics', icon: 'FlaskConical' },
      { label: 'Lab Orders', href: '/hospital/test-orders', icon: 'ClipboardList' },
      { label: 'Sample Collection', href: '/hospital/sample-collection', icon: 'PackagePlus' },
      { label: 'Lab Results', href: '/hospital/test-results', icon: 'FileSpreadsheet' },
      { label: 'Radiology', href: '/hospital/radiology', icon: 'Microscope' },
      { label: 'Scan Reports', href: '/hospital/radiology-reports', icon: 'BarChart3' },
    ],
  },
  hospitalPharmacy: {
    title: 'Pharmacy',
    items: [
      { label: 'Prescriptions', href: '/hospital/prescription-orders', icon: 'FileText' },
      { label: 'Medicine Dispensing', href: '/hospital/medicine-dispensing', icon: 'Pill' },
      { label: 'Returns', href: '/hospital/medicine-returns', icon: 'ArrowRightLeft' },
      { label: 'Batch & Expiry', href: '/hospital/batch-expiry', icon: 'QrCode' },
    ],
  },
  hospitalEmergencyOt: {
    title: 'Emergency & OT',
    items: [
      { label: 'Emergency Registration', href: '/hospital/emergency-registration', icon: 'AlertTriangle' },
      { label: 'Triage', href: '/hospital/triage', icon: 'Activity' },
      { label: 'Emergency Cases', href: '/hospital/emergency-cases', icon: 'HeartPulse' },
      { label: 'Surgery Schedule', href: '/hospital/surgery-schedule', icon: 'CalendarCheck' },
      { label: 'OT Booking', href: '/hospital/ot-booking', icon: 'ClipboardList' },
      { label: 'Operation Notes', href: '/hospital/operation-notes', icon: 'PenLine' },
    ],
  },
  hospitalBilling: {
    title: 'Billing',
    items: [
      { label: 'New Bill', href: '/hospital/new-bill', icon: 'Receipt' },
      { label: 'Pharmacy Billing', href: '/hospital/pharmacy-billing', icon: 'Pill' },
      { label: 'Bills & Invoices', href: '/hospital/bills-invoices', icon: 'FileText' },
      { label: 'Payments', href: '/hospital/payments', icon: 'Wallet' },
      { label: 'Outstanding', href: '/hospital/outstanding', icon: 'IndianRupee' },
      { label: 'Refunds', href: '/hospital/refunds', icon: 'ArrowRightLeft' },
      { label: 'Packages', href: '/hospital/packages', icon: 'Package' },
      { label: 'Estimates', href: '/hospital/estimates', icon: 'FileSpreadsheet' },
    ],
  },
  hospitalReports: {
    title: 'Reports',
    items: [
      { label: 'Patient Reports', href: '/hospital/patient-reports', icon: 'BarChart3' },
      { label: 'OPD Reports', href: '/hospital/opd-reports', icon: 'BarChart3' },
      { label: 'IPD Reports', href: '/hospital/ipd-reports', icon: 'BarChart3' },
      { label: 'Doctor Reports', href: '/hospital/doctor-reports', icon: 'BarChart3' },
      { label: 'Diagnostics Reports', href: '/hospital/diagnostics-reports', icon: 'BarChart3' },
      { label: 'Pharmacy Reports', href: '/hospital/pharmacy-reports', icon: 'BarChart3' },
      { label: 'Billing Reports', href: '/hospital/billing-reports', icon: 'BarChart3' },
      { label: 'Bed Occupancy Reports', href: '/hospital/bed-occupancy-reports', icon: 'BarChart3' },
    ],
  },

  // --- School ---
  schoolAdmissions: {
    title: 'Admissions',
    items: [
      { label: 'New Admission', href: '/school/admissions/new-admission', icon: 'UserPlus' },
      { label: 'Applications', href: '/school/admissions/applications', icon: 'FileText' },
      { label: 'Admission Enquiries', href: '/school/admissions/enquiries', icon: 'MessageCircle' },
      { label: 'Merit / Selection', href: '/school/admissions/merit-selection', icon: 'Award' },
      { label: 'Admission Reports', href: '/school/admissions/reports', icon: 'BarChart3' },
    ],
  },
  schoolStudents: {
    title: 'Students',
    items: [
      { label: 'Student Registration', href: '/school/students/registration', icon: 'UserPlus' },
      { label: 'Student List', href: '/school/students/list', icon: 'Users' },
      { label: 'Student Profile', href: '/school/students/profile', icon: 'UserRound' },
      { label: 'Student Documents', href: '/school/students/documents', icon: 'FolderOpen' },
    ],
  },
  schoolAcademic: {
    title: 'Academics',
    items: [
      { label: 'Classes & Sections', href: '/school/academics/classes-sections', icon: 'BookOpen' },
      { label: 'Subjects', href: '/school/academics/subjects', icon: 'GraduationCap' },
      { label: 'Teachers & Subjects', href: '/school/academics/teachers-subjects', icon: 'UserCheck' },
      { label: 'Timetable', href: '/school/academics/timetable', icon: 'CalendarClock' },
      { label: 'Academic Year', href: '/school/academics/academic-year', icon: 'CalendarCheck' },
    ],
  },
  schoolAttendance: {
    title: 'Attendance',
    items: [
      { label: 'Student Attendance', href: '/school/attendance/student-attendance', icon: 'CalendarCheck' },
      { label: 'Teacher Attendance', href: '/school/attendance/teacher-attendance', icon: 'UserCheck' },
      { label: 'Attendance Register', href: '/school/attendance/register', icon: 'ClipboardList' },
      { label: 'Leave Management', href: '/school/attendance/leave-management', icon: 'CalendarOff' },
      { label: 'Attendance Reports', href: '/school/attendance/reports', icon: 'BarChart3' },
    ],
  },
  schoolFeeManagement: {
    title: 'Fees & Billing',
    items: [
      { label: 'Fee Structure', href: '/school/fees/fee-structure', icon: 'Wallet' },
      { label: 'Student Fees', href: '/school/fees/student-fees', icon: 'Users' },
      { label: 'Collect Fees', href: '/school/fees/collect-fees', icon: 'CreditCard' },
      { label: 'Fee Receipts', href: '/school/fees/receipts', icon: 'Receipt' },
      { label: 'Outstanding', href: '/school/fees/outstanding', icon: 'AlertTriangle' },
      { label: 'Refunds', href: '/school/fees/refunds', icon: 'RefreshCw' },
    ],
  },
  schoolExaminations: {
    title: 'Examinations',
    items: [
      { label: 'Exam Setup', href: '/school/examinations/exam-setup', icon: 'FileText' },
      { label: 'Exam Schedule', href: '/school/examinations/schedule', icon: 'CalendarClock' },
      { label: 'Marks Entry', href: '/school/examinations/marks-entry', icon: 'PenLine' },
      { label: 'Results', href: '/school/examinations/results', icon: 'BarChart3' },
      { label: 'Report Cards', href: '/school/examinations/report-cards', icon: 'FileCheck' },
    ],
  },
  schoolHomework: {
    title: 'Homework & Assignments',
    items: [
      { label: 'Create Homework', href: '/school/homework/create', icon: 'FilePlus' },
      { label: 'Assignment List', href: '/school/homework/assignment-list', icon: 'ClipboardList' },
      { label: 'Student Submissions', href: '/school/homework/submissions', icon: 'FileCheck' },
      { label: 'Evaluation', href: '/school/homework/evaluation', icon: 'CheckSquare' },
    ],
  },
  schoolCommunication: {
    title: 'Communication',
    items: [
      { label: 'Notices', href: '/school/communication/notices', icon: 'FileText' },
      { label: 'Announcements', href: '/school/communication/announcements', icon: 'Bell' },
      { label: 'Messages', href: '/school/communication/messages', icon: 'Mail' },
      { label: 'Parent Communication', href: '/school/communication/parent-communication', icon: 'Contact' },
      { label: 'Notifications', href: '/school/communication/notifications', icon: 'MessageCircle' },
    ],
  },
  schoolLibrary: {
    title: 'Library',
    items: [
      { label: 'Books', href: '/school/library/books', icon: 'BookOpen' },
      { label: 'Categories', href: '/school/library/categories', icon: 'Grid3x3' },
      { label: 'Issue / Return', href: '/school/library/issue-return', icon: 'ArrowRightLeft' },
      { label: 'Members', href: '/school/library/members', icon: 'Users' },
      { label: 'Fines', href: '/school/library/fines', icon: 'Wallet' },
    ],
  },
  schoolTransport: {
    title: 'Transport',
    items: [
      { label: 'Routes', href: '/school/transport/routes', icon: 'Route' },
      { label: 'Vehicles', href: '/school/transport/vehicles', icon: 'Bus' },
      { label: 'Stops', href: '/school/transport/stops', icon: 'Building2' },
      { label: 'Student Allocation', href: '/school/transport/student-allocation', icon: 'UserCheck' },
      { label: 'Transport Tracking', href: '/school/transport/tracking', icon: 'Activity' },
    ],
  },
  schoolHostel: {
    title: 'Hostel',
    items: [
      { label: 'Rooms', href: '/school/hostel/rooms', icon: 'Home' },
      { label: 'Allocation', href: '/school/hostel/allocation', icon: 'Users' },
      { label: 'Mess', href: '/school/hostel/mess', icon: 'UtensilsCrossed' },
      { label: 'Hostel Fees', href: '/school/hostel/fees', icon: 'Wallet' },
    ],
  },

  // --- Hotel ---
  hotelDashboard: {
    title: 'Dashboard',
    items: [
      { label: 'Dashboard', href: '/hotel/dashboard', icon: 'LayoutDashboard' },
    ],
  },
  hotelReservations: {
    title: 'Reservations',
    items: [
      { label: 'New Reservation', href: '/hotel/reservations/new', icon: 'CalendarCheck' },
      { label: 'Reservation List', href: '/hotel/reservations/list', icon: 'ClipboardList' },
      { label: 'Calendar', href: '/hotel/reservations/calendar', icon: 'CalendarClock' },
      { label: 'Availability', href: '/hotel/reservations/availability', icon: 'CheckSquare' },
      { label: 'Rate Plans', href: '/hotel/reservations/rate-plans', icon: 'IndianRupee' },
    ],
  },
  hotelFrontDesk: {
    title: 'Front Desk',
    items: [
      { label: 'Check-in', href: '/hotel/front-desk/check-in', icon: 'LogIn' },
      { label: 'In-House Guests', href: '/hotel/front-desk/in-house-guests', icon: 'Users' },
      { label: 'Check-out', href: '/hotel/front-desk/check-out', icon: 'LogOut' },
      { label: 'Room Change', href: '/hotel/front-desk/room-change', icon: 'ArrowRightLeft' },
      { label: 'Guest Requests', href: '/hotel/front-desk/guest-requests', icon: 'Bell' },
    ],
  },
  hotelGuests: {
    title: 'Guests',
    items: [
      { label: 'Guest Registration', href: '/hotel/guests/registration', icon: 'UserPlus' },
      { label: 'Guest List', href: '/hotel/guests/list', icon: 'Users' },
      { label: 'Guest Profile', href: '/hotel/guests/profile', icon: 'UserRound' },
      { label: 'Guest Documents', href: '/hotel/guests/documents', icon: 'FolderOpen' },
    ],
  },
  hotelRoomsAvailability: {
    title: 'Rooms & Availability',
    items: [
      { label: 'Room Types', href: '/hotel/rooms-availability/room-types', icon: 'BedDouble' },
      { label: 'Rooms', href: '/hotel/rooms-availability/rooms', icon: 'Home' },
      { label: 'Room Status', href: '/hotel/rooms-availability/room-status', icon: 'CheckSquare' },
      { label: 'Floor / Building', href: '/hotel/rooms-availability/floor-building', icon: 'Building2' },
    ],
  },
  hotelHousekeeping: {
    title: 'Housekeeping',
    items: [
      { label: 'Dashboard', href: '/hotel/housekeeping/room-status', icon: 'LayoutDashboard' },
      { label: 'Cleaning Tasks', href: '/hotel/housekeeping/cleaning-tasks', icon: 'Sparkles' },
      { label: 'Housekeeping Schedule', href: '/hotel/housekeeping/schedule', icon: 'CalendarClock' },
      { label: 'Lost & Found', href: '/hotel/housekeeping/lost-found', icon: 'FolderOpen' },
    ],
  },
  hotelRestaurantPos: {
    title: 'Restaurant & POS',
    items: [
      { label: 'POS Billing', href: '/hotel/restaurant-pos/billing', icon: 'Receipt' },
      { label: 'Tables', href: '/hotel/restaurant-pos/tables', icon: 'UtensilsCrossed' },
      { label: 'Menu', href: '/hotel/restaurant-pos/menu', icon: 'BookOpen' },
      { label: 'Orders', href: '/hotel/restaurant-pos/orders', icon: 'ShoppingCart' },
      { label: 'KOT', href: '/hotel/restaurant-pos/kot', icon: 'ReceiptText' },
    ],
  },
  hotelServices: {
    title: 'Hotel Services',
    items: [
      { label: 'Room Service', href: '/hotel/services/room-service', icon: 'Bell' },
      { label: 'Laundry', href: '/hotel/services/laundry', icon: 'Sparkles' },
      { label: 'Spa', href: '/hotel/services/spa', icon: 'HeartPulse' },
      { label: 'Transport', href: '/hotel/services/transport', icon: 'Truck' },
      { label: 'Other Services', href: '/hotel/services/other-services', icon: 'PackagePlus' },
    ],
  },
  hotelBilling: {
    title: 'Billing',
    items: [
      { label: 'New Bill', href: '/hotel/billing/new-bill', icon: 'Receipt' },
      { label: 'Guest Billing', href: '/hotel/billing/guest-billing', icon: 'Users' },
      { label: 'Restaurant Billing', href: '/hotel/billing/restaurant-billing', icon: 'UtensilsCrossed' },
      { label: 'Bills & Invoices', href: '/hotel/billing/bills-invoices', icon: 'FileText' },
      { label: 'Payments', href: '/hotel/billing/payments', icon: 'Wallet' },
      { label: 'Outstanding', href: '/hotel/billing/outstanding', icon: 'IndianRupee' },
      { label: 'Refunds', href: '/hotel/billing/refunds', icon: 'ArrowRightLeft' },
      { label: 'Estimates', href: '/hotel/billing/estimates', icon: 'FileSpreadsheet' },
    ],
  },
  hotelReports: {
    title: 'Reports',
    items: [
      { label: 'Reports', href: '/hotel/reports', icon: 'BarChart3' },
    ],
  },

  // --- Construction ---
  constructionDashboard: {
    title: 'Dashboard',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    ],
  },
  constructionClientsTenders: {
    title: 'Clients & Tenders',
    items: [
      { label: 'Clients', href: '/construction/clients-tenders/clients', icon: 'Users' },
      { label: 'Tender Management', href: '/construction/clients-tenders/tender-management', icon: 'ClipboardList' },
      { label: 'Estimates', href: '/construction/clients-tenders/estimates', icon: 'FileText' },
      { label: 'Agreements', href: '/construction/clients-tenders/agreements', icon: 'FileCheck' },
    ],
  },
  constructionProjects: {
    title: 'Projects',
    items: [
      { label: 'BOQ', href: '/construction/projects/boq', icon: 'FileSpreadsheet' },
      { label: 'Work Orders', href: '/construction/projects/work-orders', icon: 'ClipboardList' },
      { label: 'Site Progress', href: '/construction/projects/site-progress', icon: 'TrendingUp' },
      { label: 'Milestones', href: '/construction/projects/milestones', icon: 'CalendarCheck' },
      { label: 'RA Bills', href: '/construction/projects/ra-bills', icon: 'Receipt' },
      { label: 'Retention Money', href: '/construction/projects/retention-money', icon: 'Wallet' },
    ],
  },
  constructionMaterials: {
    title: 'Materials',
    items: [
      { label: 'Purchase', href: '/construction/materials/purchase', icon: 'ShoppingCart' },
      { label: 'Site Inventory', href: '/construction/materials/site-inventory', icon: 'Warehouse' },
      { label: 'Vendors', href: '/construction/materials/vendors', icon: 'UserCheck' },
      { label: 'Material Issue', href: '/construction/materials/material-issue', icon: 'PackageMinus' },
      { label: 'Stock', href: '/construction/materials/stock', icon: 'Package' },
    ],
  },
  constructionContractorsLabour: {
    title: 'Contractors & Labour',
    items: [
      { label: 'Contractors', href: '/construction/contractors-labour/contractors', icon: 'Users' },
      { label: 'Subcontractor Billing', href: '/construction/contractors-labour/subcontractor-billing', icon: 'ReceiptText' },
      { label: 'Labour Register', href: '/construction/contractors-labour/labour-register', icon: 'BookOpen' },
      { label: 'Wages', href: '/construction/contractors-labour/wages', icon: 'Wallet' },
    ],
  },

  // --- NGO ---
  ngoDashboard: {
    title: 'Dashboard',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    ],
  },
  ngoDonors: {
    title: 'Donors',
    items: [
      { label: 'Donors', href: '/ngo/donors/donors', icon: 'Users' },
      { label: 'Donor Categories', href: '/ngo/donors/categories', icon: 'Grid3x3' },
      { label: 'Recurring Donors', href: '/ngo/donors/recurring-donors', icon: 'RefreshCw' },
      { label: 'Donor Communication', href: '/ngo/donors/communication', icon: 'MessageCircle' },
    ],
  },
  ngoDonations: {
    title: 'Donations',
    items: [
      { label: 'Donation Entry', href: '/ngo/donations/entry', icon: 'PenLine' },
      { label: 'Donation Receipt', href: '/ngo/donations/receipt', icon: 'Receipt' },
      { label: '80G Receipt Auto-Generation', href: '/ngo/donations/80g-receipt-auto-generation', icon: 'FileCheck' },
      { label: 'Online Payment', href: '/ngo/donations/online-payment', icon: 'CreditCard' },
      { label: 'In-Kind Donations', href: '/ngo/donations/in-kind-donations', icon: 'PackagePlus' },
      { label: 'Reports', href: '/ngo/donations/reports', icon: 'BarChart3' },
    ],
  },
  ngoVolunteers: {
    title: 'Volunteers',
    items: [
      { label: 'Volunteers', href: '/ngo/volunteers/volunteers', icon: 'Users' },
      { label: 'Assignments', href: '/ngo/volunteers/assignments', icon: 'ClipboardList' },
      { label: 'Certificates', href: '/ngo/volunteers/certificates', icon: 'Award' },
    ],
  },
  ngoBeneficiaries: {
    title: 'Beneficiaries',
    items: [
      { label: 'Beneficiary Register', href: '/ngo/beneficiaries/register', icon: 'BookOpen' },
      { label: 'Assistance Records', href: '/ngo/beneficiaries/assistance-records', icon: 'ClipboardList' },
      { label: 'Impact Reporting', href: '/ngo/beneficiaries/impact-reporting', icon: 'BarChart3' },
    ],
  },
  ngoCampaignsProjects: {
    title: 'Campaigns & Projects',
    items: [
      { label: 'Campaigns', href: '/ngo/campaigns-projects/campaigns', icon: 'TrendingUp' },
      { label: 'Projects', href: '/ngo/campaigns-projects/projects', icon: 'LayoutGrid' },
      { label: 'Grant Management', href: '/ngo/campaigns-projects/grant-management', icon: 'Award' },
      { label: 'CSR Partner Portal', href: '/ngo/campaigns-projects/csr-partner-portal', icon: 'UserCheck' },
      { label: 'Budget vs Actual', href: '/ngo/campaigns-projects/budget-vs-actual', icon: 'Scale' },
    ],
  },

  // --- Automobile ---
  automobileDashboard: {
    title: 'Dashboard',
    items: [
      { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    ],
  },
  automobileCustomersVehicles: {
    title: 'Customers & Vehicles',
    items: [
      { label: 'Customers', href: '/automobile/customers-vehicles/customers', icon: 'Users' },
      { label: 'Vehicles', href: '/automobile/customers-vehicles/vehicles', icon: 'Car' },
      { label: 'Vehicle Service History', href: '/automobile/customers-vehicles/service-history', icon: 'History' },
      { label: 'Documents', href: '/automobile/customers-vehicles/documents', icon: 'FolderOpen' },
    ],
  },
  automobileJobCards: {
    title: 'Job Cards',
    items: [
      { label: 'Create Job Card', href: '/automobile/job-cards/create', icon: 'FilePlus' },
      { label: 'Technician Allocation', href: '/automobile/job-cards/technician-allocation', icon: 'UserCheck' },
      { label: 'Estimate', href: '/automobile/job-cards/estimate', icon: 'FileText' },
      { label: 'WhatsApp Approval Link', href: '/automobile/job-cards/whatsapp-approval-link', icon: 'MessageCircle' },
      { label: 'Status Tracking', href: '/automobile/job-cards/status-tracking', icon: 'Activity' },
    ],
  },
  automobileService: {
    title: 'Service',
    items: [
      { label: 'Inspection', href: '/automobile/service/inspection', icon: 'CheckSquare' },
      { label: 'Repair', href: '/automobile/service/repair', icon: 'Wrench' },
      { label: 'Spare Parts', href: '/automobile/service/spare-parts', icon: 'Package' },
      { label: 'Labour Charges', href: '/automobile/service/labour-charges', icon: 'Wallet' },
      { label: 'Road Test', href: '/automobile/service/road-test', icon: 'Route' },
      { label: 'Delivery', href: '/automobile/service/delivery', icon: 'Truck' },
    ],
  },
  automobileServiceInvoice: {
    title: 'Service Invoice',
    items: [
      { label: 'Estimate -> Invoice', href: '/automobile/service-invoice/estimate-to-invoice', icon: 'Receipt' },
      { label: 'Parts + Labour Split', href: '/automobile/service-invoice/parts-labour-split', icon: 'FileSpreadsheet' },
      { label: 'Insurance Claim Billing', href: '/automobile/service-invoice/insurance-claim-billing', icon: 'FileCheck' },
    ],
  },

  // --- Finance ---
  financeDashboard: {
    title: 'Dashboard',
    items: [{ label: 'Dashboard', href: '/finance/dashboard', icon: 'LayoutDashboard' }],
  },
  financeCustomers: {
    title: 'Customers',
    icon: 'Users',
    items: [
      { label: 'Add Customers', href: '/finance/customers/add', icon: 'UserPlus' },
      { label: 'All Customers', href: '/finance/customers/all', icon: 'Users' },
      { label: 'Closed Customers', href: '/finance/customers/closed', icon: 'XCircle' },
    ],
  },
  financeCollections: {
    title: 'Collection Entry',
    items: [{ label: 'Collection Entry', href: '/finance/collections', icon: 'IndianRupee' }],
  },
  financeBills: {
    title: 'Bills',
    icon: 'ReceiptText',
    items: [
      { label: 'Auto Bill', href: '/finance/bills/auto', icon: 'ReceiptText' },
      { label: 'Manual Bill', href: '/finance/bills/manual', icon: 'FileText' },
    ],
  },
  financeReminders: {
    title: 'Reminders',
    items: [{ label: 'Reminders', href: '/finance/reminders', icon: 'CalendarClock' }],
  },
  financeFinishedCustomers: {
    title: 'Closed Customers',
    items: [{ label: 'Closed Customers', href: '/finance/customers/closed', icon: 'XCircle' }],
  },
  financeReports: {
    title: 'Reports',
    items: [{ label: 'Reports', href: '/finance/reports', icon: 'BarChart3' }],
  },
  financeProfileSettings: {
    title: 'Profile Settings',
    items: [{ label: 'Profile Settings', href: '/finance/profile-settings', icon: 'Settings' }],
  },
};

// Shared by every category: Inventory, Accounting, GST, Customers, Employee Management, More Modules, Settings.
const COMMON_LAYOUT = ['main', 'inventory', 'accounting', 'gst', 'crm', 'hrPayroll', 'moreModules', 'reportsHub', 'dataManagement', 'settings'];

const CATEGORY_LAYOUTS = {
  retail: ['main', 'sales', 'purchase', 'inventory', 'accounting', 'gst', 'crm', 'hrPayroll', 'moreModules', 'reports', 'dataManagement', 'settings'],
  hospital: [
    'main', 'hospitalPatients', 'hospitalAppointments', 'hospitalBilling', 'hospitalOpd', 'hospitalIpdBeds',
    'hospitalDoctorsNursing', 'hospitalDiagnostics', 'hospitalPharmacy',
    'hospitalEmergencyOt', 'hospitalReports',
    ...COMMON_LAYOUT.slice(1).filter((key) => key !== 'reportsHub'),
  ],
  school: [
    'main', 'schoolAdmissions', 'schoolStudents', 'schoolAcademic', 'schoolAttendance',
    'schoolFeeManagement', 'schoolExaminations', 'schoolHomework', 'schoolCommunication',
    'schoolTransport', 'schoolLibrary', 'schoolHostel', 'reportsHub', 'dataManagement',
  ],
  hotel: [
    'hotelDashboard', 'hotelReservations', 'hotelFrontDesk', 'hotelGuests', 'hotelRoomsAvailability',
    'hotelHousekeeping', 'hotelRestaurantPos', 'hotelServices', 'hotelBilling', 'hotelReports',
    ...COMMON_LAYOUT.slice(1).filter((key) => key !== 'crm' && key !== 'reportsHub'),
  ],
  restaurant: COMMON_LAYOUT,
  manufacturing: COMMON_LAYOUT,
  construction: [
    'constructionDashboard', 'constructionClientsTenders', 'constructionProjects',
    'constructionMaterials', 'constructionContractorsLabour', ...COMMON_LAYOUT.slice(1),
  ],
  ngo: [
    'ngoDashboard', 'ngoDonors', 'ngoDonations', 'ngoVolunteers', 'ngoBeneficiaries',
    'ngoCampaignsProjects', ...COMMON_LAYOUT.slice(1),
  ],
  automobile: [
    'automobileDashboard', 'automobileCustomersVehicles', 'automobileJobCards',
    'automobileService', 'automobileServiceInvoice', ...COMMON_LAYOUT.slice(1),
  ],
  finance: [
    'financeDashboard', 'financeCustomers', 'financeCollections', 'financeBills',
    'financeReminders', 'financeReports', 'reportsHub', 'dataManagement', 'financeProfileSettings',
  ],
  transport: COMMON_LAYOUT,
  other: COMMON_LAYOUT,
};

export function getSidebarSections(category, user = {}) {
  const layout = CATEGORY_LAYOUTS[category] || CATEGORY_LAYOUTS.other;
  const sections = layout
    .map((key) => SECTIONS[key])
    .map((section, index) => {
      const key = layout[index];
      if (!section) return null;
      const locked = !hasModuleAccess(user, SECTION_PERMISSION[key]);
      const items = key === 'settings' && canManageBranchUsers(user) && !isSuperAdminUser(user)
        ? section.items.map((item) => ({ ...item, locked: item.href !== '/users-roles' }))
        : section.items;
      return { ...section, items, locked };
    })
    .filter((section) => section && (!section.adminOnly || isAdminUser(user)));
  const dashboard = sections.filter((section) => section.title === 'Dashboard');
  const unlocked = sections.filter((section) => section.title !== 'Dashboard' && !section.locked);
  const locked = sections.filter((section) => section.title !== 'Dashboard' && section.locked);
  return [...dashboard, ...unlocked, ...locked];
}

function isAdminUser(user = {}) {
  return user.isPlatformOwner || ['Super Admin', 'Admin', 'Owner'].includes(user.role);
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
      { label: 'Sales Reports', href: '/sales-reports', icon: 'BarChart3' },
    ],
  },
  purchase: {
    title: 'Purchase',
    items: [
      { label: 'Purchase Order', href: '/billing/purchase-order/new', icon: 'ShoppingCart' },
      { label: 'Purchase Entry', href: '/billing/purchase-entry/new', icon: 'FileCheck' },
      { label: 'Supplier Returns', href: '/billing/supplier-return/new', icon: 'ArrowRightLeft' },
      { label: 'Purchase Reports', href: '/purchase-reports', icon: 'BarChart3' },
    ],
  },  gst: {
    title: 'GST',
    items: [
      { label: 'GST Dashboard', href: '/gst-dashboard', icon: 'PieChart' },
      { label: 'GSTR-1', href: '/gstr-1', icon: 'FileText' },
      { label: 'GSTR-3B', href: '/gstr-3b', icon: 'FileSpreadsheet' },
      { label: 'GSTR-9', href: '/gstr-9', icon: 'FileCheck' },
      { label: 'GST Reconciliation', href: '/gst-reconciliation', icon: 'RefreshCw' },
      { label: 'GST Reports', href: '/gst-reports', icon: 'BarChart3' },
    ],
  },
  accounting: {
    title: 'Accounting',
    items: [
      { label: 'Vouchers', href: '/vouchers', icon: 'ReceiptText' },
      { label: 'Accounting Reports', href: '/accounting-reports', icon: 'BarChart3' },
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
      { label: 'Categories', href: '/product-categories', icon: 'Grid3x3' },
      { label: 'Brands', href: '/brands', icon: 'Award' },
      { label: 'Warehouse', href: '/warehouse', icon: 'Warehouse' },
      { label: 'Barcode', href: '/barcode', icon: 'QrCode' },
      { label: 'Stock Summary', href: '/stock-summary', icon: 'BarChart3' },
      { label: 'Stock Ledger', href: '/stock-ledger', icon: 'BookOpen' },
      { label: 'Stock In', href: '/stock-in', icon: 'PackagePlus' },
      { label: 'Stock Out', href: '/stock-out', icon: 'PackageMinus' },
      { label: 'Stock Alerts', href: '/stock-alerts', icon: 'AlertTriangle' },
      { label: 'Inventory Reports', href: '/inventory-reports', icon: 'BarChart3' },
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
      { label: 'Export Data', href: '/data-management/export' },
      { label: 'Import Data', href: '/data-management/import' },
      { label: 'Delete Period', href: '/data-management/delete-period' },
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
  },  settings: {
    title: 'Settings',
    items: [
      { label: 'Multi Branch', href: '/multi-branch', icon: 'GitBranch' },
      { label: 'Users & Roles', href: '/users-roles', icon: 'Shield' },
      { label: 'Business Settings', href: '/business-settings', icon: 'Settings' },
    ],
  },

  // --- Hospital ---
  patientManagement: {
    title: 'Patient Management',
    items: [
      { label: 'Patient Registration', href: '/hospital/patient-registration', icon: 'UserPlus' },
      { label: 'Patient List', href: '/hospital/patients', icon: 'UserRound' },
      { label: 'Medical History', href: '/hospital/medical-history', icon: 'FolderOpen' },
      { label: 'Allergies', href: '/hospital/allergies', icon: 'AlertTriangle' },
      { label: 'Family Details', href: '/hospital/family-details', icon: 'Users' },
      { label: 'Documents', href: '/hospital/patient-documents', icon: 'FolderOpen' },
      { label: 'Insurance Details', href: '/hospital/insurance-details', icon: 'FileCheck' },
    ],
  },
  appointmentManagement: {
    title: 'Appointment Management',
    items: [
      { label: 'Book Appointment', href: '/hospital/book-appointment', icon: 'CalendarCheck' },
      { label: 'Calendar', href: '/hospital/appointment-calendar', icon: 'CalendarClock' },
      { label: 'Doctor Schedule', href: '/hospital/doctor-schedule', icon: 'Stethoscope' },
      { label: 'Queue Management', href: '/hospital/queue-management', icon: 'ClipboardList' },
      { label: 'Token System', href: '/hospital/token-system', icon: 'ReceiptText' },
      { label: 'Follow-up Appointments', href: '/hospital/follow-up-appointments', icon: 'Bell' },
    ],
  },
  opd: {
    title: 'OPD',
    items: [
      { label: 'OP Registration', href: '/hospital/op-registration', icon: 'ClipboardList' },
      { label: 'Consultation', href: '/hospital/consultation', icon: 'Activity' },
      { label: 'Diagnosis', href: '/hospital/diagnosis', icon: 'FileText' },
      { label: 'Prescription', href: '/hospital/prescription', icon: 'FileText' },
      { label: 'Procedures', href: '/hospital/procedures', icon: 'HeartPulse' },
      { label: 'Follow-up', href: '/hospital/follow-up', icon: 'Bell' },
    ],
  },
  ipd: {
    title: 'IPD',
    items: [
      { label: 'Admission', href: '/hospital/admission', icon: 'ClipboardList' },
      { label: 'Bed Allocation', href: '/hospital/bed-allocation', icon: 'BedDouble' },
      { label: 'Treatment Plan', href: '/hospital/treatment-plan', icon: 'HeartPulse' },
      { label: 'Daily Progress', href: '/hospital/daily-progress', icon: 'TrendingUp' },
      { label: 'Nursing Notes', href: '/hospital/nursing-notes', icon: 'PenLine' },
      { label: 'Discharge Summary', href: '/hospital/discharge-summary', icon: 'FileCheck' },
    ],
  },
  emergency: {
    title: 'Emergency',
    items: [
      { label: 'Emergency Registration', href: '/hospital/emergency-registration', icon: 'AlertTriangle' },
      { label: 'Triage', href: '/hospital/triage', icon: 'Activity' },
      { label: 'Casualty', href: '/hospital/casualty', icon: 'HeartPulse' },
      { label: 'Critical Care', href: '/hospital/critical-care', icon: 'Stethoscope' },
    ],
  },
  doctors: {
    title: 'Doctors',
    items: [
      { label: 'Doctor List', href: '/hospital/doctors', icon: 'Stethoscope' },
      { label: 'Departments', href: '/hospital/departments', icon: 'Building2' },
      { label: 'Specializations', href: '/hospital/specializations', icon: 'Award' },
      { label: 'Availability', href: '/hospital/doctor-availability', icon: 'CalendarCheck' },
      { label: 'Schedule', href: '/hospital/doctor-schedule-management', icon: 'CalendarClock' },
      { label: 'Consultation Fees', href: '/hospital/consultation-fees', icon: 'Wallet' },
    ],
  },
  nursing: {
    title: 'Nursing',
    items: [
      { label: 'Nurse List', href: '/hospital/nurse-list', icon: 'Users' },
      { label: 'Shift Allocation', href: '/hospital/shift-allocation', icon: 'CalendarClock' },
      { label: 'Patient Assignment', href: '/hospital/patient-assignment', icon: 'UserCheck' },
      { label: 'Nursing Notes', href: '/hospital/nursing-care-notes', icon: 'PenLine' },
    ],
  },
  wardBedManagement: {
    title: 'Ward & Bed Management',
    items: [
      { label: 'Wards', href: '/hospital/wards', icon: 'Building2' },
      { label: 'Rooms', href: '/hospital/rooms', icon: 'Home' },
      { label: 'Beds', href: '/hospital/beds', icon: 'BedDouble' },
      { label: 'ICU', href: '/hospital/icu', icon: 'HeartPulse' },
      { label: 'NICU', href: '/hospital/nicu', icon: 'HeartPulse' },
      { label: 'Occupancy', href: '/hospital/occupancy', icon: 'BarChart3' },
    ],
  },
  laboratory: {
    title: 'Laboratory',
    items: [
      { label: 'Test Categories', href: '/hospital/test-categories', icon: 'Grid3x3' },
      { label: 'Test Booking', href: '/hospital/test-booking', icon: 'CalendarCheck' },
      { label: 'Sample Collection', href: '/hospital/sample-collection', icon: 'PackagePlus' },
      { label: 'Test Results', href: '/hospital/test-results', icon: 'FlaskConical' },
      { label: 'Reports', href: '/hospital/lab-reports', icon: 'BarChart3' },
    ],
  },
  radiology: {
    title: 'Radiology',
    items: [
      { label: 'X-Ray', href: '/hospital/x-ray', icon: 'Microscope' },
      { label: 'CT Scan', href: '/hospital/ct-scan', icon: 'Activity' },
      { label: 'MRI', href: '/hospital/mri', icon: 'Activity' },
      { label: 'Ultrasound', href: '/hospital/ultrasound', icon: 'Activity' },
      { label: 'ECG', href: '/hospital/ecg', icon: 'HeartPulse' },
      { label: 'Reports', href: '/hospital/radiology-reports', icon: 'BarChart3' },
    ],
  },
  pharmacy: {
    title: 'Pharmacy',
    items: [
      { label: 'Medicine Dispensing', href: '/hospital/medicine-dispensing', icon: 'Pill' },
      { label: 'Prescription Orders', href: '/hospital/prescription-orders', icon: 'FileText' },
      { label: 'Medicine Returns', href: '/hospital/medicine-returns', icon: 'ArrowRightLeft' },
      { label: 'Batch Tracking', href: '/hospital/batch-tracking', icon: 'QrCode' },
      { label: 'Expiry Alerts', href: '/hospital/expiry-alerts', icon: 'AlertTriangle' },
    ],
  },
  medicalBilling: {
    title: 'Medical Billing',
    items: [
      { label: 'Medical Bills', href: '/hospital/medical-bills', icon: 'Receipt' },
      { label: 'Insurance Claims', href: '/hospital/insurance-claims', icon: 'FileCheck' },
      { label: 'Payments', href: '/hospital/payments', icon: 'Wallet' },
      { label: 'Receivables', href: '/hospital/receivables', icon: 'IndianRupee' },
      { label: 'Revenue Reports', href: '/hospital/revenue-reports', icon: 'BarChart3' },
    ],
  },

  // --- School ---
  schoolStudentManagement: {
    title: 'Student Management',
    items: [
      { label: 'Students', href: '/school/students', icon: 'Users' },
      { label: 'Admission', href: '/school/admission', icon: 'UserPlus' },
      { label: 'Transfer', href: '/school/transfer', icon: 'ArrowRightLeft' },
      { label: 'Parent Details', href: '/school/parent-details', icon: 'Contact' },
      { label: 'Certificates', href: '/school/certificates', icon: 'Award' },
    ],
  },
  schoolAcademic: {
    title: 'Academic',
    items: [
      { label: 'Classes', href: '/school/classes', icon: 'BookOpen' },
      { label: 'Sections', href: '/school/sections', icon: 'Grid3x3' },
      { label: 'Subjects', href: '/school/subjects', icon: 'GraduationCap' },
      { label: 'Timetable', href: '/school/timetable', icon: 'CalendarClock' },
      { label: 'Exams', href: '/school/exams', icon: 'FileText' },
    ],
  },
  schoolFeeManagement: {
    title: 'Fee Management',
    items: [
      { label: 'Fee Structure', href: '/school/fee-structure', icon: 'Wallet' },
      { label: 'Fee Collection', href: '/school/fee-collection', icon: 'CreditCard' },
      { label: 'Fee Receipt', href: '/school/fee-receipt', icon: 'Receipt' },
      { label: 'Scholarships', href: '/school/scholarships', icon: 'Award' },
      { label: 'Due Reports', href: '/school/due-reports', icon: 'AlertTriangle' },
    ],
  },
  schoolLibrary: {
    title: 'Library',
    items: [
      { label: 'Books', href: '/school/library/books', icon: 'BookOpen' },
      { label: 'Issue / Return', href: '/school/library/issue-return', icon: 'ArrowRightLeft' },
      { label: 'Fine', href: '/school/library/fine', icon: 'Wallet' },
      { label: 'Catalogue', href: '/school/library/catalogue', icon: 'Grid3x3' },
    ],
  },
  schoolTransport: {
    title: 'Transport',
    items: [
      { label: 'Routes', href: '/school/transport/routes', icon: 'Route' },
      { label: 'Vehicles', href: '/school/transport/vehicles', icon: 'Bus' },
      { label: 'Drivers', href: '/school/transport/drivers', icon: 'Users' },
      { label: 'GPS Tracking', href: '/school/transport/gps-tracking', icon: 'Activity' },
      { label: 'Transport Fees', href: '/school/transport/fees', icon: 'Wallet' },
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
      { label: 'Dashboard', href: '/dashboard', icon: 'LayoutDashboard' },
    ],
  },
  hotelGuestManagement: {
    title: 'Guest Management',
    items: [
      { label: 'Guests', href: '/hotel/guests', icon: 'Users' },
      { label: 'Bookings', href: '/hotel/bookings', icon: 'CalendarCheck' },
      { label: 'Check-In', href: '/hotel/check-in', icon: 'LogIn' },
      { label: 'Check-Out', href: '/hotel/check-out', icon: 'LogOut' },
      { label: 'Guest History', href: '/hotel/guest-history', icon: 'History' },
    ],
  },
  hotelRooms: {
    title: 'Rooms',
    items: [
      { label: 'Room Types', href: '/hotel/room-types', icon: 'BedDouble' },
      { label: 'Availability', href: '/hotel/availability', icon: 'CheckSquare' },
      { label: 'Housekeeping', href: '/hotel/housekeeping', icon: 'Sparkles' },
      { label: 'Maintenance', href: '/hotel/maintenance', icon: 'Wrench' },
    ],
  },
  hotelBilling: {
    title: 'Billing',
    items: [
      { label: 'Guest Invoice', href: '/hotel/guest-invoice', icon: 'Receipt' },
      { label: 'POS', href: '/hotel/pos', icon: 'ShoppingCart' },
      { label: 'Payments', href: '/hotel/payments', icon: 'Wallet' },
      { label: 'Reports', href: '/hotel/billing-reports', icon: 'BarChart3' },
    ],
  },
  hotelRestaurant: {
    title: 'Restaurant',
    items: [
      { label: 'Table Management', href: '/hotel/restaurant/table-management', icon: 'UtensilsCrossed' },
      { label: 'KOT', href: '/hotel/restaurant/kot', icon: 'ReceiptText' },
      { label: 'Menu', href: '/hotel/restaurant/menu', icon: 'BookOpen' },
      { label: 'Room Service', href: '/hotel/restaurant/room-service', icon: 'Bell' },
      { label: 'Bar', href: '/hotel/restaurant/bar', icon: 'Wallet' },
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
};

// Shared by every category: GST, Accounting, CRM, Inventory, Employee Management, More Modules, Settings.
const COMMON_LAYOUT = ['main', 'gst', 'accounting', 'crm', 'inventory', 'hrPayroll', 'moreModules', 'dataManagement', 'settings'];

const CATEGORY_LAYOUTS = {
  retail: ['main', 'sales', 'purchase', 'crm', 'inventory', 'accounting', 'gst', 'hrPayroll', 'moreModules', 'reports', 'dataManagement', 'settings'],
  hospital: [
    'main', 'patientManagement', 'appointmentManagement', 'opd', 'ipd', 'emergency',
    'doctors', 'nursing', 'wardBedManagement', 'laboratory', 'radiology', 'pharmacy',
    ...COMMON_LAYOUT.slice(1),
  ],
  school: [
    'main', 'schoolStudentManagement', 'schoolAcademic', 'schoolFeeManagement',
    'schoolLibrary', 'schoolTransport', 'schoolHostel', ...COMMON_LAYOUT.slice(1),
  ],
  hotel: [
    'hotelDashboard', 'hotelGuestManagement', 'hotelRooms', 'hotelBilling', 'hotelRestaurant',
    ...COMMON_LAYOUT.slice(1),
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
  transport: COMMON_LAYOUT,
  other: COMMON_LAYOUT,
};

export function getSidebarSections(category, user = {}) {
  const layout = CATEGORY_LAYOUTS[category] || CATEGORY_LAYOUTS.other;
  return layout.map((key) => SECTIONS[key]).filter((section) => section && (!section.adminOnly || isAdminUser(user)));
}

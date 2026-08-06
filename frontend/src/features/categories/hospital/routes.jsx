import { clinicalRoutes } from './modules/clinical/routes.jsx';
import { laboratoryRoutes } from './modules/laboratory/routes.jsx';
import { BillsInvoicesPage } from './modules/medical-billing/BillsInvoicesPage.jsx';
import { EstimatesPage } from './modules/medical-billing/EstimatesPage.jsx';
import { HospitalPaymentsPage } from './modules/medical-billing/HospitalPaymentsPage.jsx';
import { medicalBillingRoutes } from './modules/medical-billing/routes.jsx';
import { NewBillPage } from './modules/medical-billing/NewBillPage.jsx';
import { OutstandingPage } from './modules/medical-billing/OutstandingPage.jsx';
import { PackagesPage } from './modules/medical-billing/PackagesPage.jsx';
import { RefundsPage } from './modules/medical-billing/RefundsPage.jsx';
import { patientManagementRoutes } from './modules/patient-management/routes.jsx';
import { PharmacyBillingPage } from './modules/pharmacy/PharmacyBillingPage.jsx';
import { pharmacyRoutes } from './modules/pharmacy/routes.jsx';
import { DocumentsPage } from './modules/patient-management/DocumentsPage.jsx';
import { InsurancePage } from './modules/patient-management/InsurancePage.jsx';
import { PatientRegistrationPage } from './PatientRegistrationPage.jsx';
import {
  AppointmentWorkflowPage,
  BedWorkflowPage,
  ClinicalWorkflowPage,
  DiagnosticWorkflowPage,
  DoctorWorkflowPage,
  EmergencyWorkflowPage,
  NursingWorkflowPage,
  PatientWorkflowPage,
  PharmacyWorkflowPage,
} from './HospitalWorkflowPages.jsx';

const patientFields = [
  { key: 'name', label: 'Patient Name', required: true },
  { key: 'age', label: 'Age', type: 'number' },
  { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
  { key: 'phone', label: 'Phone' },
  { key: 'address', label: 'Address', type: 'textarea', full: true },
  { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
];

const allergyFields = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'name', label: 'Allergy / Substance', required: true },
  { key: 'severity', label: 'Severity', type: 'select', options: ['Mild', 'Moderate', 'Severe', 'Critical'] },
  { key: 'reaction', label: 'Reaction' },
  { key: 'date', label: 'Identified Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Resolved', 'Archived'] },
  { key: 'notes', label: 'Clinical Notes', type: 'textarea', full: true },
];

const familyFields = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'name', label: 'Family Member Name', required: true },
  { key: 'relationship', label: 'Relationship' },
  { key: 'phone', label: 'Phone' },
  { key: 'isEmergencyContact', label: 'Emergency Contact', type: 'select', options: ['Yes', 'No'] },
  { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
  { key: 'notes', label: 'Address / Notes', type: 'textarea', full: true },
];

const documentFields = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'name', label: 'Document Name', required: true },
  { key: 'documentType', label: 'Document Type', type: 'select', options: ['Lab Report', 'Radiology Report', 'Prescription', 'Insurance', 'Consent Form', 'Other'] },
  { key: 'documentNo', label: 'Document No' },
  { key: 'date', label: 'Document Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Received', 'Verified', 'Archived'] },
  { key: 'notes', label: 'Document Notes', type: 'textarea', full: true },
];

const insuranceFields = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'name', label: 'Insurance Provider', required: true },
  { key: 'policyNo', label: 'Policy No' },
  { key: 'tpaName', label: 'TPA Name' },
  { key: 'validTill', label: 'Valid Till', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Expired', 'Claim Submitted', 'Approved', 'Rejected'] },
  { key: 'notes', label: 'Coverage / Notes', type: 'textarea', full: true },
];

const appointmentFields = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'doctorName', label: 'Doctor', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'departmentName', label: 'Department', type: 'lookup', lookupModule: 'hospital/departments' },
  { key: 'date', label: 'Date', type: 'date', required: true },
  { key: 'time', label: 'Time', type: 'time' },
  { key: 'tokenNo', label: 'Token No' },
  { key: 'status', label: 'Status', type: 'select', options: ['Scheduled', 'Waiting', 'In Consultation', 'Completed', 'Cancelled'] },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
];

const doctorLinkedFields = [
  { key: 'doctorName', label: 'Doctor', required: true, type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'departmentName', label: 'Department', type: 'lookup', lookupModule: 'hospital/departments' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'time', label: 'Time / Slot' },
  { key: 'status', label: 'Status', type: 'select', options: ['Available', 'Booked', 'On Leave', 'Unavailable'] },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
];

const doctorFields = [
  { key: 'name', label: 'Doctor Name', required: true },
  { key: 'departmentName', label: 'Department', type: 'lookup', lookupModule: 'hospital/departments' },
  { key: 'specialization', label: 'Specialization' },
  { key: 'availability', label: 'Availability', type: 'select', options: ['Available', 'Booked', 'On Leave', 'Unavailable'] },
  { key: 'schedule', label: 'Schedule / Slots', type: 'textarea', full: true },
  { key: 'consultationFee', label: 'Consultation Fee', type: 'number' },
  { key: 'phone', label: 'Phone' },
  { key: 'status', label: 'Status', type: 'select', options: ['Active', 'On Leave', 'Inactive'] },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
];

const opdFields = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'doctorName', label: 'Doctor', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'departmentName', label: 'Department', type: 'lookup', lookupModule: 'hospital/departments' },
  { key: 'name', label: 'OP Visit / Complaint', required: true },
  { key: 'date', label: 'Visit Date', type: 'date' },
  { key: 'symptoms', label: 'Symptoms', type: 'textarea', full: true },
  { key: 'diagnosis', label: 'Diagnosis', type: 'textarea', full: true },
  { key: 'prescription', label: 'Prescription', type: 'textarea', full: true },
  { key: 'procedureNotes', label: 'Procedure Notes', type: 'textarea', full: true },
  { key: 'followUpDate', label: 'Follow-up Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Registered', 'In Consultation', 'Diagnosed', 'Prescribed', 'Procedure Done', 'Follow-up'] },
  { key: 'notes', label: 'Clinical Notes', type: 'textarea', full: true },
];

const ipdFields = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'doctorName', label: 'Attending Doctor', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'departmentName', label: 'Department', type: 'lookup', lookupModule: 'hospital/departments' },
  { key: 'name', label: 'Admission / Case Title', required: true },
  { key: 'admissionDate', label: 'Admission Date', type: 'date' },
  { key: 'wardName', label: 'Ward' },
  { key: 'roomName', label: 'Room' },
  { key: 'bedNumber', label: 'Bed Number' },
  { key: 'reason', label: 'Reason for Admission', type: 'textarea', full: true },
  { key: 'treatmentPlan', label: 'Treatment Plan', type: 'textarea', full: true },
  { key: 'dailyProgress', label: 'Daily Progress', type: 'textarea', full: true },
  { key: 'nursingNotes', label: 'Nursing Notes', type: 'textarea', full: true },
  { key: 'dischargeDate', label: 'Discharge Date', type: 'date' },
  { key: 'dischargeSummary', label: 'Discharge Summary', type: 'textarea', full: true },
  { key: 'status', label: 'Status', type: 'select', options: ['Admitted', 'Bed Allocated', 'Treatment Planned', 'In Progress', 'Nursing Review', 'Ready for Discharge', 'Discharged'] },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
];

const emergencyFields = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'doctorName', label: 'Doctor', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'name', label: 'Emergency Case', required: true },
  { key: 'arrivalTime', label: 'Arrival Time', type: 'time' },
  { key: 'status', label: 'Priority', type: 'select', options: ['Red', 'Orange', 'Yellow', 'Green', 'Discharged'] },
  { key: 'notes', label: 'Triage Notes', type: 'textarea', full: true },
];

const otFields = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'doctorName', label: 'Doctor / Surgeon', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'name', label: 'Procedure / Operation', required: true },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'time', label: 'Time / Slot', type: 'time' },
  { key: 'status', label: 'Status', type: 'select', options: ['Scheduled', 'Booked', 'In Progress', 'Completed', 'Cancelled'] },
  { key: 'notes', label: 'Operation Notes', type: 'textarea', full: true },
];

const bedFields = [
  { key: 'name', label: 'Name / Number', required: true },
  { key: 'wardName', label: 'Ward' },
  { key: 'roomName', label: 'Room' },
  { key: 'patientName', label: 'Patient', type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'status', label: 'Status', type: 'select', options: ['Available', 'Occupied', 'Cleaning', 'Maintenance'] },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
];

const nursingFields = [
  { key: 'patientName', label: 'Patient', type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'nurseName', label: 'Nurse', type: 'lookup', lookupModule: 'hospital/nurses' },
  { key: 'departmentName', label: 'Department', type: 'lookup', lookupModule: 'hospital/departments' },
  { key: 'name', label: 'Care Task / Shift', required: true },
  { key: 'shift', label: 'Shift', type: 'select', options: ['Morning', 'Evening', 'Night'] },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Assigned', 'In Care', 'Observed', 'Completed'] },
  { key: 'notes', label: 'Nursing Notes', type: 'textarea', full: true },
];

const labFields = [
  { key: 'patientName', label: 'Patient', type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'name', label: 'Test / Report', required: true },
  { key: 'doctorName', label: 'Doctor', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'sampleId', label: 'Sample ID' },
  { key: 'result', label: 'Result', type: 'textarea', full: true },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Booked', 'Collected', 'Processing', 'Reported'] },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
];

const reportFields = [
  { key: 'name', label: 'Report Name', required: true },
  { key: 'period', label: 'Period' },
  { key: 'departmentName', label: 'Department' },
  { key: 'status', label: 'Status', type: 'select', options: ['Draft', 'Generated', 'Reviewed'] },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
];

const billingFields = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'name', label: 'Bill / Package / Estimate', required: true },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'amount', label: 'Amount', type: 'number' },
  { key: 'status', label: 'Status', type: 'select', options: ['Draft', 'Pending', 'Paid', 'Refunded', 'Cancelled'] },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
];

const radiologyFields = [
  { key: 'patientName', label: 'Patient', type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'doctorName', label: 'Doctor', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'name', label: 'Scan / Report', required: true },
  { key: 'modality', label: 'Modality', type: 'select', options: ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'ECG'] },
  { key: 'date', label: 'Scan Date', type: 'date' },
  { key: 'findings', label: 'Findings', type: 'textarea', full: true },
  { key: 'status', label: 'Status', type: 'select', options: ['Scheduled', 'In Scan', 'Reporting', 'Completed'] },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
];

const pharmacyFields = [
  { key: 'patientName', label: 'Patient', type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'doctorName', label: 'Doctor', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'name', label: 'Medicine / Order', required: true },
  { key: 'quantity', label: 'Quantity', type: 'number' },
  { key: 'batchNo', label: 'Batch No' },
  { key: 'expiryDate', label: 'Expiry Date', type: 'date' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Ordered', 'Dispensed', 'Returned', 'Cancelled'] },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
];

const WORKFLOW_BY_GROUP = {
  'Patient Management': PatientWorkflowPage,
  'Appointment Management': AppointmentWorkflowPage,
  OPD: ClinicalWorkflowPage,
  IPD: ClinicalWorkflowPage,
  Emergency: EmergencyWorkflowPage,
  Doctors: DoctorWorkflowPage,
  Nursing: NursingWorkflowPage,
  'Ward & Bed Management': BedWorkflowPage,
  Laboratory: DiagnosticWorkflowPage,
  Radiology: DiagnosticWorkflowPage,
  Pharmacy: PharmacyWorkflowPage,
};

function recordRoute(path, moduleKey, title, group, fields, subtitle = '', options = {}) {
  const Component = WORKFLOW_BY_GROUP[group] || PatientWorkflowPage;
  return {
    path,
    element: (
      <Component
        moduleKey={moduleKey}
        title={title}
        group={group}
        subtitle={subtitle}
        fields={fields}
        {...options}
      />
    ),
  };
}

const requestedHospitalRoutes = [
  { path: '/hospital/patient-registration', element: <PatientRegistrationPage /> },
  recordRoute('/hospital/allergies', 'hospital/allergies', 'Allergies', 'Patient Management', allergyFields, 'Maintain complete EMR'),
  recordRoute('/hospital/family-details', 'hospital/family-details', 'Family Details', 'Patient Management', familyFields, 'Maintain complete EMR'),
  { path: '/hospital/patient-documents', element: <DocumentsPage /> },
  { path: '/hospital/insurance-details', element: <InsurancePage /> },

  recordRoute('/hospital/book-appointment', 'hospital/appointments', 'Book Appointment', 'Appointment Management', appointmentFields, 'Online and walk-in appointments', { mode: 'schedule' }),
  recordRoute('/hospital/appointment-calendar', 'hospital/appointments', 'Calendar', 'Appointment Management', appointmentFields, 'Doctor availability', { mode: 'schedule' }),
  recordRoute('/hospital/doctor-schedule', 'hospital/doctor-schedule', 'Doctor Schedule', 'Appointment Management', doctorLinkedFields, 'Doctor availability'),
  recordRoute('/hospital/queue-management', 'hospital/appointments', 'Queue Management', 'Appointment Management', appointmentFields, 'Priority handling', { mode: 'queue' }),
  recordRoute('/hospital/token-system', 'hospital/appointments', 'Token System', 'Appointment Management', appointmentFields, 'Token generation', { mode: 'token' }),
  recordRoute('/hospital/queue-token', 'hospital/appointments', 'Queue/Token', 'Appointment Management', appointmentFields, 'Queue and token handling', { mode: 'token' }),
  recordRoute('/hospital/follow-up-appointments', 'hospital/appointments', 'Follow-up Appointments', 'Appointment Management', appointmentFields, 'SMS/WhatsApp reminders', { mode: 'schedule' }),

  recordRoute('/hospital/op-registration', 'hospital/opd-visits', 'OP Registration', 'OPD', opdFields, 'Consultation workflow', { columns: ['Registered', 'In Consultation', 'Diagnosed', 'Prescribed', 'Procedure Done', 'Follow-up'] }),
  recordRoute('/hospital/consultation', 'hospital/opd-visits', 'Consultation', 'OPD', opdFields, 'Consultation workflow', { columns: ['Registered', 'In Consultation', 'Diagnosed', 'Prescribed', 'Procedure Done', 'Follow-up'] }),
  recordRoute('/hospital/diagnosis', 'hospital/opd-visits', 'Diagnosis', 'OPD', opdFields, 'Clinical notes', { columns: ['Registered', 'In Consultation', 'Diagnosed', 'Prescribed', 'Procedure Done', 'Follow-up'] }),
  recordRoute('/hospital/prescription', 'hospital/opd-visits', 'Prescription', 'OPD', opdFields, 'Digital prescriptions', { columns: ['Registered', 'In Consultation', 'Diagnosed', 'Prescribed', 'Procedure Done', 'Follow-up'] }),
  recordRoute('/hospital/procedures', 'hospital/opd-visits', 'Procedures', 'OPD', opdFields, 'Consultation workflow', { columns: ['Registered', 'In Consultation', 'Diagnosed', 'Prescribed', 'Procedure Done', 'Follow-up'] }),
  recordRoute('/hospital/follow-up', 'hospital/opd-visits', 'Follow-up', 'OPD', opdFields, 'Follow-up workflow', { columns: ['Registered', 'In Consultation', 'Diagnosed', 'Prescribed', 'Procedure Done', 'Follow-up'] }),

  recordRoute('/hospital/admission', 'hospital/ipd-admissions', 'Admission', 'IPD', ipdFields, 'Admit patients', { columns: ['Admitted', 'Bed Allocated', 'Treatment Planned', 'In Progress', 'Nursing Review', 'Ready for Discharge', 'Discharged'] }),
  recordRoute('/hospital/inpatients', 'hospital/ipd-admissions', 'Inpatients', 'IPD', ipdFields, 'Current admitted patients', { columns: ['Admitted', 'Bed Allocated', 'Treatment Planned', 'In Progress', 'Nursing Review', 'Ready for Discharge', 'Discharged'] }),
  recordRoute('/hospital/ward-room-bed', 'hospital/bed-management', 'Ward/Room/Bed', 'Ward & Bed Management', bedFields, 'Ward, room, and bed availability'),
  recordRoute('/hospital/bed-allocation', 'hospital/ipd-admissions', 'Bed Allocation', 'IPD', ipdFields, 'Track treatment', { columns: ['Admitted', 'Bed Allocated', 'Treatment Planned', 'In Progress', 'Nursing Review', 'Ready for Discharge', 'Discharged'] }),
  recordRoute('/hospital/transfer', 'hospital/ipd-admissions', 'Transfer', 'IPD', ipdFields, 'Ward or bed transfer', { columns: ['Admitted', 'Bed Allocated', 'Treatment Planned', 'In Progress', 'Nursing Review', 'Ready for Discharge', 'Discharged'] }),
  recordRoute('/hospital/treatment-plan', 'hospital/ipd-admissions', 'Treatment Plan', 'IPD', ipdFields, 'Track treatment', { columns: ['Admitted', 'Bed Allocated', 'Treatment Planned', 'In Progress', 'Nursing Review', 'Ready for Discharge', 'Discharged'] }),
  recordRoute('/hospital/daily-progress', 'hospital/ipd-admissions', 'Daily Progress', 'IPD', ipdFields, 'Track treatment', { columns: ['Admitted', 'Bed Allocated', 'Treatment Planned', 'In Progress', 'Nursing Review', 'Ready for Discharge', 'Discharged'] }),
  recordRoute('/hospital/nursing-notes', 'hospital/ipd-admissions', 'Nursing Notes', 'IPD', ipdFields, 'Track treatment', { columns: ['Admitted', 'Bed Allocated', 'Treatment Planned', 'In Progress', 'Nursing Review', 'Ready for Discharge', 'Discharged'] }),
  recordRoute('/hospital/discharge-summary', 'hospital/ipd-admissions', 'Discharge Summary', 'IPD', ipdFields, 'Generate discharge summary', { columns: ['Admitted', 'Bed Allocated', 'Treatment Planned', 'In Progress', 'Nursing Review', 'Ready for Discharge', 'Discharged'] }),

  recordRoute('/hospital/emergency-registration', 'hospital/emergency-cases', 'Emergency Registration', 'Emergency', emergencyFields, 'Quick patient intake'),
  recordRoute('/hospital/triage', 'hospital/emergency-cases', 'Triage', 'Emergency', emergencyFields, 'Priority handling'),
  recordRoute('/hospital/emergency-cases', 'hospital/emergency-cases', 'Emergency Cases', 'Emergency', emergencyFields, 'Emergency workflow'),
  recordRoute('/hospital/casualty', 'hospital/emergency-cases', 'Casualty', 'Emergency', emergencyFields, 'Emergency workflow'),
  recordRoute('/hospital/critical-care', 'hospital/emergency-cases', 'Critical Care', 'Emergency', emergencyFields, 'Emergency workflow'),
  recordRoute('/hospital/surgery-schedule', 'hospital/ot-workflow', 'Surgery Schedule', 'Emergency & OT', otFields, 'Schedule surgeries and procedures'),
  recordRoute('/hospital/ot-booking', 'hospital/ot-workflow', 'OT Booking', 'Emergency & OT', otFields, 'Book operation theatre slots'),
  recordRoute('/hospital/operation-notes', 'hospital/ot-workflow', 'Operation Notes', 'Emergency & OT', otFields, 'Record operation notes'),

  recordRoute('/hospital/doctors', 'hospital/doctors', 'Doctor List', 'Doctors', doctorFields, 'Manage doctors'),
  recordRoute('/hospital/specializations', 'hospital/doctors', 'Specializations', 'Doctors', doctorFields, 'Manage doctors'),
  recordRoute('/hospital/doctor-availability', 'hospital/doctors', 'Availability', 'Doctors', doctorFields, 'Schedule management'),
  recordRoute('/hospital/doctor-schedule-management', 'hospital/doctors', 'Schedule', 'Doctors', doctorFields, 'Schedule management'),
  recordRoute('/hospital/consultation-fees', 'hospital/doctors', 'Consultation Fees', 'Doctors', doctorFields, 'Consultation tracking'),

  recordRoute('/hospital/nurse-list', 'hospital/nurses', 'Nurse List', 'Nursing', [
    { key: 'name', label: 'Nurse Name', required: true },
    { key: 'departmentName', label: 'Department', type: 'lookup', lookupModule: 'hospital/departments' },
    { key: 'phone', label: 'Phone' },
    { key: 'shift', label: 'Shift' },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'On Leave', 'Inactive'] },
  ], 'Shift management'),
  recordRoute('/hospital/shift-allocation', 'hospital/nursing-care', 'Shift Allocation', 'Nursing', nursingFields, 'Shift management'),
  recordRoute('/hospital/patient-assignment', 'hospital/nursing-care', 'Patient Assignment', 'Nursing', nursingFields, 'Patient care records'),
  recordRoute('/hospital/nursing-care-notes', 'hospital/nursing-care', 'Nursing Notes', 'Nursing', nursingFields, 'Patient care records'),

  recordRoute('/hospital/wards', 'hospital/bed-management', 'Wards', 'Ward & Bed Management', bedFields, 'Live availability'),
  recordRoute('/hospital/rooms', 'hospital/bed-management', 'Rooms', 'Ward & Bed Management', bedFields, 'Live availability'),
  recordRoute('/hospital/beds', 'hospital/bed-management', 'Beds', 'Ward & Bed Management', bedFields, 'Bed allocation'),
  recordRoute('/hospital/icu', 'hospital/bed-management', 'ICU', 'Ward & Bed Management', bedFields, 'Bed allocation'),
  recordRoute('/hospital/nicu', 'hospital/bed-management', 'NICU', 'Ward & Bed Management', bedFields, 'Bed allocation'),
  recordRoute('/hospital/occupancy', 'hospital/bed-management', 'Occupancy', 'Ward & Bed Management', bedFields, 'Live availability'),

  recordRoute('/hospital/test-categories', 'hospital/lab-workflow', 'Test Categories', 'Laboratory', labFields, 'Lab workflow'),
  recordRoute('/hospital/test-booking', 'hospital/lab-workflow', 'Test Booking', 'Laboratory', labFields, 'Lab workflow'),
  recordRoute('/hospital/sample-collection', 'hospital/lab-workflow', 'Sample Collection', 'Laboratory', labFields, 'Lab workflow'),
  recordRoute('/hospital/test-results', 'hospital/lab-workflow', 'Test Results', 'Laboratory', labFields, 'Report generation'),
  recordRoute('/hospital/lab-reports', 'hospital/lab-workflow', 'Reports', 'Laboratory', labFields, 'Doctor access'),

  recordRoute('/hospital/x-ray', 'hospital/radiology-workflow', 'X-Ray', 'Radiology', radiologyFields, 'Scan scheduling', { radiology: true }),
  recordRoute('/hospital/radiology', 'hospital/radiology-workflow', 'Radiology', 'Radiology', radiologyFields, 'Scan scheduling', { radiology: true }),
  recordRoute('/hospital/ct-scan', 'hospital/radiology-workflow', 'CT Scan', 'Radiology', radiologyFields, 'Scan scheduling', { radiology: true }),
  recordRoute('/hospital/mri', 'hospital/radiology-workflow', 'MRI', 'Radiology', radiologyFields, 'Scan scheduling', { radiology: true }),
  recordRoute('/hospital/ultrasound', 'hospital/radiology-workflow', 'Ultrasound', 'Radiology', radiologyFields, 'Scan scheduling', { radiology: true }),
  recordRoute('/hospital/ecg', 'hospital/radiology-workflow', 'ECG', 'Radiology', radiologyFields, 'Scan scheduling', { radiology: true }),
  recordRoute('/hospital/radiology-reports', 'hospital/radiology-workflow', 'Reports', 'Radiology', radiologyFields, 'Digital reports', { radiology: true }),

  recordRoute('/hospital/medicine-dispensing', 'hospital/pharmacy-dispensing', 'Medicine Dispensing', 'Pharmacy', pharmacyFields, 'Dispense medicines'),
  recordRoute('/hospital/prescription-orders', 'hospital/pharmacy-dispensing', 'Prescription Orders', 'Pharmacy', pharmacyFields, 'Link prescriptions'),
  recordRoute('/hospital/medicine-returns', 'hospital/pharmacy-dispensing', 'Medicine Returns', 'Pharmacy', pharmacyFields, 'Track issued medicines'),
  recordRoute('/hospital/batch-tracking', 'hospital/pharmacy-dispensing', 'Batch Tracking', 'Pharmacy', pharmacyFields, 'Track issued medicines'),
  recordRoute('/hospital/batch-expiry', 'hospital/pharmacy-dispensing', 'Batch/Expiry', 'Pharmacy', pharmacyFields, 'Track batches and expiry alerts'),
  recordRoute('/hospital/expiry-alerts', 'hospital/pharmacy-dispensing', 'Expiry Alerts', 'Pharmacy', pharmacyFields, 'Track expiring issued medicines'),

  { path: '/hospital/new-bill', element: <NewBillPage /> },
  { path: '/hospital/pharmacy-billing', element: <PharmacyBillingPage /> },
  { path: '/hospital/bills-invoices', element: <BillsInvoicesPage /> },
  { path: '/hospital/payments', element: <HospitalPaymentsPage /> },
  { path: '/hospital/outstanding', element: <OutstandingPage /> },
  { path: '/hospital/refunds', element: <RefundsPage /> },
  { path: '/hospital/packages', element: <PackagesPage /> },
  { path: '/hospital/estimates', element: <EstimatesPage /> },

  recordRoute('/hospital/patient-reports', 'hospital/reports', 'Patient Reports', 'Reports', reportFields, 'Patient reports'),
  recordRoute('/hospital/opd-reports', 'hospital/reports', 'OPD Reports', 'Reports', reportFields, 'OPD reports'),
  recordRoute('/hospital/ipd-reports', 'hospital/reports', 'IPD Reports', 'Reports', reportFields, 'IPD reports'),
  recordRoute('/hospital/doctor-reports', 'hospital/reports', 'Doctor Reports', 'Reports', reportFields, 'Doctor reports'),
  recordRoute('/hospital/diagnostics-reports', 'hospital/reports', 'Diagnostics Reports', 'Reports', reportFields, 'Diagnostics reports'),
  recordRoute('/hospital/pharmacy-reports', 'hospital/reports', 'Pharmacy Reports', 'Reports', reportFields, 'Pharmacy reports'),
  recordRoute('/hospital/billing-reports', 'hospital/reports', 'Billing Reports', 'Reports', reportFields, 'Billing reports'),
  recordRoute('/hospital/bed-occupancy-reports', 'hospital/reports', 'Bed Occupancy Reports', 'Reports', reportFields, 'Bed occupancy reports'),
  recordRoute('/hospital/occupancy-clinical-reports', 'hospital/reports', 'Occupancy & Clinical Reports', 'Reports', reportFields, 'Occupancy and clinical reports'),
];

export const hospitalRoutes = [
  ...requestedHospitalRoutes,
  ...patientManagementRoutes,
  ...clinicalRoutes,
  ...laboratoryRoutes,
  ...pharmacyRoutes,
  ...medicalBillingRoutes,
];

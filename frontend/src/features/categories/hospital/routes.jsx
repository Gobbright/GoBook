import { clinicalRoutes } from './modules/clinical/routes.jsx';
import { ConsultationPage } from './modules/clinical/ConsultationPage.jsx';
import { DiagnosisPage } from './modules/clinical/DiagnosisPage.jsx';
import { PrescriptionPage } from './modules/clinical/PrescriptionPage.jsx';
import { ProceduresPage } from './modules/clinical/ProceduresPage.jsx';
import { FollowUpPlanPage } from './modules/clinical/FollowUpPlanPage.jsx';
import { AdmissionPage } from './modules/clinical/AdmissionPage.jsx';
import { InpatientsPage } from './modules/clinical/InpatientsPage.jsx';
import { NursesPage } from './modules/clinical/NursesPage.jsx';
import { PatientAssignmentPage } from './modules/clinical/PatientAssignmentPage.jsx';
import { ShiftAllocationPage } from './modules/clinical/ShiftAllocationPage.jsx';
import { WardRoomsPage } from './modules/clinical/WardRoomsPage.jsx';
import { BedAllocationPage } from './modules/clinical/BedAllocationPage.jsx';
import { TransferPage } from './modules/clinical/TransferPage.jsx';
import { DischargeWorkflowPage } from './modules/clinical/DischargeWorkflowPage.jsx';
import { laboratoryRoutes } from './modules/laboratory/routes.jsx';
import { LaboratoryPage } from './modules/laboratory/LaboratoryPage.jsx';
import { RadiologyPage } from './modules/laboratory/RadiologyPage.jsx';
import { ScanReportsPage } from './modules/laboratory/ScanReportsPage.jsx';
import { BillsInvoicesPage } from './modules/medical-billing/BillsInvoicesPage.jsx';
import { EstimatesPage } from './modules/medical-billing/EstimatesPage.jsx';
import { HospitalPaymentsPage } from './modules/medical-billing/HospitalPaymentsPage.jsx';
import { medicalBillingRoutes } from './modules/medical-billing/routes.jsx';
import { NewBillPage } from './modules/medical-billing/NewBillPage.jsx';
import { OutstandingPage } from './modules/medical-billing/OutstandingPage.jsx';
import { PackagesPage } from './modules/medical-billing/PackagesPage.jsx';
import { RefundsPage } from './modules/medical-billing/RefundsPage.jsx';
import { patientManagementRoutes } from './modules/patient-management/routes.jsx';
import { BatchExpiryPage } from './modules/pharmacy/BatchExpiryPage.jsx';
import { MedicineDispensingPage } from './modules/pharmacy/MedicineDispensingPage.jsx';
import { MedicineReturnsPage } from './modules/pharmacy/MedicineReturnsPage.jsx';
import { PharmacyBillingPage } from './modules/pharmacy/PharmacyBillingPage.jsx';
import { PrescriptionsQueuePage } from './modules/pharmacy/PrescriptionsQueuePage.jsx';
import { pharmacyRoutes } from './modules/pharmacy/routes.jsx';
import { AppointmentCalendarPage } from './AppointmentCalendarPage.jsx';
import { BookAppointmentPage } from './BookAppointmentPage.jsx';
import { DoctorSchedulePage } from './DoctorSchedulePage.jsx';
import { EmergencyCasesPage } from './EmergencyCasesPage.jsx';
import { EmergencyRegistrationPage } from './EmergencyRegistrationPage.jsx';
import { HospitalReportsPage } from './HospitalReportsPage.jsx';
import { OTBookingPage } from './OTBookingPage.jsx';
import { OperationNotesPage } from './OperationNotesPage.jsx';
import { QueueTokenPage } from './QueueTokenPage.jsx';
import { SurgerySchedulePage } from './SurgerySchedulePage.jsx';
import { TriagePage } from './TriagePage.jsx';
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
  { key: 'patientId', label: 'Patient ID' },
  { key: 'age', label: 'Age', type: 'number' },
  { key: 'gender', label: 'Gender', type: 'select', options: ['Male', 'Female', 'Other'] },
  { key: 'phone', label: 'Phone' },
  { key: 'alternatePhone', label: 'Alternate Phone' },
  { key: 'email', label: 'Email' },
  { key: 'aadhaarNo', label: 'Aadhaar / Govt ID' },
  { key: 'bloodGroup', label: 'Blood Group' },
  { key: 'emergencyContact', label: 'Emergency Contact' },
  { key: 'emergencyMobile', label: 'Emergency Mobile' },
  { key: 'duplicateCheckStatus', label: 'Duplicate Check', type: 'select', options: ['Not Checked', 'Clear', 'Possible Duplicate', 'Merged'] },
  { key: 'mergedIntoPatientId', label: 'Merged Into Patient ID' },
  { key: 'address', label: 'Address', type: 'textarea', full: true },
  { key: 'allergySummary', label: 'Allergy Summary', type: 'textarea', full: true },
  { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
  { key: 'auditTrail', label: 'Audit Trail', type: 'textarea', full: true },
];

const allergyFields = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'patientId', label: 'Patient ID' },
  { key: 'name', label: 'Allergy / Substance', required: true },
  { key: 'allergyType', label: 'Type', type: 'select', options: ['Drug', 'Food', 'Environmental', 'Latex', 'Other'] },
  { key: 'severity', label: 'Severity', type: 'select', options: ['Mild', 'Moderate', 'Severe', 'Critical'] },
  { key: 'reaction', label: 'Reaction' },
  { key: 'date', label: 'Identified Date', type: 'date' },
  { key: 'verifiedBy', label: 'Verified By' },
  { key: 'lastReviewedAt', label: 'Last Reviewed', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Resolved', 'Archived'] },
  { key: 'notes', label: 'Clinical Notes', type: 'textarea', full: true },
  { key: 'auditTrail', label: 'Audit Trail', type: 'textarea', full: true },
];

const familyFields = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'patientId', label: 'Patient ID' },
  { key: 'name', label: 'Family Member Name', required: true },
  { key: 'relationship', label: 'Relationship' },
  { key: 'phone', label: 'Phone' },
  { key: 'isEmergencyContact', label: 'Emergency Contact', type: 'select', options: ['Yes', 'No'] },
  { key: 'consentToContact', label: 'Consent To Contact', type: 'select', options: ['Yes', 'No'] },
  { key: 'address', label: 'Address', type: 'textarea', full: true },
  { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] },
  { key: 'notes', label: 'Address / Notes', type: 'textarea', full: true },
];

const documentFields = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'patientId', label: 'Patient ID' },
  { key: 'name', label: 'Document Name', required: true },
  { key: 'documentType', label: 'Document Type', type: 'select', options: ['Lab Report', 'Radiology Report', 'Prescription', 'Insurance', 'Consent Form', 'Other'] },
  { key: 'documentNo', label: 'Document No' },
  { key: 'relatedVisitNo', label: 'Related OPD/IPD/ER No' },
  { key: 'fileName', label: 'File Name' },
  { key: 'date', label: 'Document Date', type: 'date' },
  { key: 'expiryDate', label: 'Expiry Date', type: 'date' },
  { key: 'verifiedBy', label: 'Verified By' },
  { key: 'status', label: 'Status', type: 'select', options: ['Received', 'Pending Verification', 'Verified', 'Rejected', 'Archived'] },
  { key: 'notes', label: 'Document Notes', type: 'textarea', full: true },
  { key: 'auditTrail', label: 'Audit Trail', type: 'textarea', full: true },
];

const insuranceFields = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'patientId', label: 'Patient ID' },
  { key: 'name', label: 'Insurance Provider', required: true },
  { key: 'policyNo', label: 'Policy No' },
  { key: 'tpaName', label: 'TPA Name' },
  { key: 'coverageLimit', label: 'Coverage Limit', type: 'number' },
  { key: 'availableLimit', label: 'Available Limit', type: 'number' },
  { key: 'preAuthNo', label: 'Pre-auth No' },
  { key: 'preAuthAmount', label: 'Pre-auth Amount', type: 'number' },
  { key: 'claimNo', label: 'Claim No' },
  { key: 'claimStatus', label: 'Claim Status', type: 'select', options: ['Not Started', 'Pre-auth Pending', 'Pre-auth Approved', 'Submitted', 'Approved', 'Rejected', 'Settled'] },
  { key: 'validTill', label: 'Valid Till', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Expired', 'Claim Submitted', 'Approved', 'Rejected'] },
  { key: 'notes', label: 'Coverage / Notes', type: 'textarea', full: true },
  { key: 'auditTrail', label: 'Audit Trail', type: 'textarea', full: true },
];

const appointmentFields = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'patientId', label: 'Patient ID' },
  { key: 'doctorName', label: 'Doctor', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'departmentName', label: 'Department', type: 'lookup', lookupModule: 'hospital/departments' },
  { key: 'date', label: 'Date', type: 'date', required: true },
  { key: 'time', label: 'Time', type: 'time' },
  { key: 'tokenNo', label: 'Token No' },
  { key: 'visitType', label: 'Visit Type', type: 'select', options: ['Consultation', 'Follow-up', 'Emergency Follow-up', 'Procedure Review'] },
  { key: 'confirmationStatus', label: 'Confirmation', type: 'select', options: ['Pending', 'Sent', 'Confirmed', 'Failed'] },
  { key: 'paymentStatus', label: 'Payment', type: 'select', options: ['Not Required', 'Not Collected', 'Paid', 'Refunded'] },
  { key: 'rescheduleFrom', label: 'Rescheduled From' },
  { key: 'cancellationReason', label: 'Cancel / No-show Reason' },
  { key: 'status', label: 'Status', type: 'select', options: ['Scheduled', 'Waiting', 'Called', 'In Consultation', 'Completed', 'Skipped', 'No Show', 'Cancelled'] },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  { key: 'auditTrail', label: 'Audit Trail', type: 'textarea', full: true },
];

const doctorLinkedFields = [
  { key: 'doctorName', label: 'Doctor', required: true, type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'departmentName', label: 'Department', type: 'lookup', lookupModule: 'hospital/departments' },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'time', label: 'Time / Slot' },
  { key: 'slotCapacity', label: 'Slot Capacity', type: 'number' },
  { key: 'bookedCount', label: 'Booked Count', type: 'number' },
  { key: 'overbookAllowed', label: 'Overbook Allowed', type: 'select', options: ['No', 'Yes'] },
  { key: 'blockReason', label: 'Leave / Block Reason' },
  { key: 'status', label: 'Status', type: 'select', options: ['Available', 'Booked', 'Full', 'On Leave', 'Blocked', 'Unavailable'] },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  { key: 'auditTrail', label: 'Audit Trail', type: 'textarea', full: true },
];

const doctorFields = [
  { key: 'name', label: 'Doctor Name', required: true },
  { key: 'doctorId', label: 'Doctor ID' },
  { key: 'departmentName', label: 'Department', type: 'lookup', lookupModule: 'hospital/departments' },
  { key: 'specialization', label: 'Specialization' },
  { key: 'registrationNo', label: 'Medical Registration No' },
  { key: 'qualification', label: 'Qualification' },
  { key: 'availability', label: 'Availability', type: 'select', options: ['Available', 'Booked', 'On Leave', 'Unavailable'] },
  { key: 'schedule', label: 'Schedule / Slots', type: 'textarea', full: true },
  { key: 'consultationFee', label: 'Consultation Fee', type: 'number' },
  { key: 'followUpFee', label: 'Follow-up Fee', type: 'number' },
  { key: 'emergencyAvailable', label: 'Emergency Available', type: 'select', options: ['No', 'Yes'] },
  { key: 'digitalSignature', label: 'Digital Signature Ref' },
  { key: 'phone', label: 'Phone' },
  { key: 'status', label: 'Status', type: 'select', options: ['Active', 'On Leave', 'Inactive'] },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  { key: 'auditTrail', label: 'Audit Trail', type: 'textarea', full: true },
];

const opdFields = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'patientId', label: 'Patient ID' },
  { key: 'opdNo', label: 'OPD No' },
  { key: 'appointmentId', label: 'Appointment ID' },
  { key: 'doctorName', label: 'Doctor', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'departmentName', label: 'Department', type: 'lookup', lookupModule: 'hospital/departments' },
  { key: 'name', label: 'OP Visit / Complaint', required: true },
  { key: 'date', label: 'Visit Date', type: 'date' },
  { key: 'vitals', label: 'Vitals', type: 'textarea', full: true },
  { key: 'symptoms', label: 'Symptoms', type: 'textarea', full: true },
  { key: 'diagnosisType', label: 'Diagnosis Type', type: 'select', options: ['Provisional', 'Final', 'Differential'] },
  { key: 'icdCode', label: 'ICD Code' },
  { key: 'diagnosis', label: 'Diagnosis', type: 'textarea', full: true },
  { key: 'prescription', label: 'Prescription', type: 'textarea', full: true },
  { key: 'labOrderNos', label: 'Lab Orders' },
  { key: 'radiologyOrderNos', label: 'Radiology Orders' },
  { key: 'procedureNotes', label: 'Procedure Notes', type: 'textarea', full: true },
  { key: 'followUpDate', label: 'Follow-up Date', type: 'date' },
  { key: 'billingStatus', label: 'Billing Status', type: 'select', options: ['No Charge', 'Pending', 'Billed', 'Paid', 'Cancelled'] },
  { key: 'status', label: 'Status', type: 'select', options: ['Registered', 'In Consultation', 'Diagnosed', 'Prescribed', 'Procedure Done', 'Follow-up', 'Closed'] },
  { key: 'notes', label: 'Clinical Notes', type: 'textarea', full: true },
  { key: 'auditTrail', label: 'Audit Trail', type: 'textarea', full: true },
];

const ipdFields = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'patientId', label: 'Patient ID' },
  { key: 'ipdNo', label: 'IPD No' },
  { key: 'doctorName', label: 'Attending Doctor', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'departmentName', label: 'Department', type: 'lookup', lookupModule: 'hospital/departments' },
  { key: 'name', label: 'Admission / Case Title', required: true },
  { key: 'admissionDate', label: 'Admission Date', type: 'date' },
  { key: 'admissionTime', label: 'Admission Time', type: 'time' },
  { key: 'wardName', label: 'Ward' },
  { key: 'roomName', label: 'Room' },
  { key: 'bedNumber', label: 'Bed Number' },
  { key: 'reason', label: 'Reason for Admission', type: 'textarea', full: true },
  { key: 'consentStatus', label: 'Consent', type: 'select', options: ['Pending', 'Received', 'Not Required'] },
  { key: 'insuranceStatus', label: 'Insurance / TPA', type: 'select', options: ['Self Pay', 'Pre-auth Pending', 'Pre-auth Approved', 'Rejected'] },
  { key: 'advanceStatus', label: 'Advance', type: 'select', options: ['Not Required', 'Pending', 'Collected'] },
  { key: 'treatmentPlan', label: 'Treatment Plan', type: 'textarea', full: true },
  { key: 'dailyProgress', label: 'Daily Progress', type: 'textarea', full: true },
  { key: 'vitalsTrend', label: 'Vitals Trend', type: 'textarea', full: true },
  { key: 'medicationChart', label: 'Medication Chart', type: 'textarea', full: true },
  { key: 'nursingNotes', label: 'Nursing Notes', type: 'textarea', full: true },
  { key: 'bedHistory', label: 'Bed History', type: 'textarea', full: true },
  { key: 'clearanceStatus', label: 'Clearance', type: 'select', options: ['Not Started', 'Pharmacy Pending', 'Lab Pending', 'Billing Pending', 'Cleared'] },
  { key: 'dischargeDate', label: 'Discharge Date', type: 'date' },
  { key: 'dischargeSummary', label: 'Discharge Summary', type: 'textarea', full: true },
  { key: 'status', label: 'Status', type: 'select', options: ['Admitted', 'Bed Allocated', 'Treatment Planned', 'In Progress', 'Nursing Review', 'Ready for Discharge', 'Discharged'] },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  { key: 'auditTrail', label: 'Audit Trail', type: 'textarea', full: true },
];

const emergencyFields = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'patientId', label: 'Patient ID' },
  { key: 'erNo', label: 'Emergency No' },
  { key: 'temporaryPatientId', label: 'Temporary Patient ID' },
  { key: 'doctorName', label: 'Doctor', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'name', label: 'Emergency Case', required: true },
  { key: 'arrivalDate', label: 'Arrival Date', type: 'date' },
  { key: 'arrivalTime', label: 'Arrival Time', type: 'time' },
  { key: 'arrivalMode', label: 'Arrival Mode', type: 'select', options: ['Walk-in', 'Ambulance', 'Police', 'Referral', 'Transfer from another hospital'] },
  { key: 'emergencyType', label: 'Emergency Type', type: 'select', options: ['Medical', 'Surgical', 'Trauma', 'Accident', 'Poisoning', 'Other'] },
  { key: 'triagePriority', label: 'Triage Priority', type: 'select', options: ['CRITICAL', 'URGENT', 'SEMI-URGENT', 'NON-URGENT'] },
  { key: 'triageTime', label: 'Triage Time' },
  { key: 'vitals', label: 'Vitals', type: 'textarea', full: true },
  { key: 'chiefComplaint', label: 'Chief Complaint', type: 'textarea', full: true },
  { key: 'doctorNotes', label: 'Doctor Notes', type: 'textarea', full: true },
  { key: 'orders', label: 'Orders / Diagnostics', type: 'textarea', full: true },
  { key: 'medication', label: 'Emergency Medication', type: 'textarea', full: true },
  { key: 'procedures', label: 'Emergency Procedures', type: 'textarea', full: true },
  { key: 'billingStatus', label: 'Billing Status', type: 'select', options: ['Pending', 'Added to IPD', 'Billed', 'Paid', 'Waived'] },
  { key: 'admissionStatus', label: 'Admission / Transfer', type: 'select', options: ['Not Required', 'Admit Planned', 'Admitted', 'Transferred', 'Discharged'] },
  { key: 'status', label: 'Status', type: 'select', options: ['REGISTERED', 'TRIAGED', 'WAITING', 'IN TREATMENT', 'DISCHARGED', 'ADMITTED', 'TRANSFERRED'] },
  { key: 'notes', label: 'Triage Notes', type: 'textarea', full: true },
  { key: 'auditTrail', label: 'Audit Trail', type: 'textarea', full: true },
];

const otFields = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'patientId', label: 'Patient ID' },
  { key: 'ipdNo', label: 'IPD No' },
  { key: 'surgeryId', label: 'Surgery ID' },
  { key: 'doctorName', label: 'Doctor / Surgeon', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'assistantSurgeon', label: 'Assistant Surgeon', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'anesthetist', label: 'Anesthetist', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'name', label: 'Procedure / Operation', required: true },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'time', label: 'Time / Slot', type: 'time' },
  { key: 'duration', label: 'Estimated Duration' },
  { key: 'otNo', label: 'OT No' },
  { key: 'priority', label: 'Priority', type: 'select', options: ['Routine', 'Urgent', 'Emergency'] },
  { key: 'consentStatus', label: 'Consent', type: 'select', options: ['Pending', 'Received', 'Not Required'] },
  { key: 'preOpChecklist', label: 'Pre-op Checklist', type: 'textarea', full: true },
  { key: 'equipmentRequired', label: 'Equipment Required', type: 'textarea', full: true },
  { key: 'conflictCheck', label: 'Conflict Check', type: 'select', options: ['Pending', 'Clear', 'Conflict Found'] },
  { key: 'preparationStatus', label: 'OT Preparation', type: 'select', options: ['Not Started', 'In Preparation', 'Ready', 'Delayed'] },
  { key: 'operationNoteStatus', label: 'Operation Note', type: 'select', options: ['Not Started', 'Draft', 'Finalized', 'Signed'] },
  { key: 'billingStatus', label: 'Billing Status', type: 'select', options: ['Pending', 'Added to IPD', 'Billed', 'Paid'] },
  { key: 'status', label: 'Status', type: 'select', options: ['REQUESTED', 'PLANNED', 'CONFIRMED', 'IN PROGRESS', 'COMPLETED', 'CANCELLED', 'POSTPONED'] },
  { key: 'notes', label: 'Operation Notes', type: 'textarea', full: true },
  { key: 'auditTrail', label: 'Audit Trail', type: 'textarea', full: true },
];

const bedFields = [
  { key: 'name', label: 'Name / Number', required: true },
  { key: 'wardName', label: 'Ward' },
  { key: 'roomName', label: 'Room' },
  { key: 'bedNumber', label: 'Bed Number' },
  { key: 'bedType', label: 'Bed Type', type: 'select', options: ['General', 'Semi Private', 'Private', 'ICU', 'NICU', 'PICU', 'Emergency'] },
  { key: 'patientName', label: 'Patient', type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'patientId', label: 'Patient ID' },
  { key: 'ipdNo', label: 'IPD No' },
  { key: 'dailyCharge', label: 'Daily Charge', type: 'number' },
  { key: 'nursingCharge', label: 'Nursing Charge', type: 'number' },
  { key: 'housekeepingStatus', label: 'Housekeeping', type: 'select', options: ['Clean', 'Pending', 'In Cleaning', 'Ready'] },
  { key: 'maintenanceReason', label: 'Maintenance Reason' },
  { key: 'lastAllocatedAt', label: 'Last Allocated At' },
  { key: 'lastReleasedAt', label: 'Last Released At' },
  { key: 'status', label: 'Status', type: 'select', options: ['Available', 'Occupied', 'Reserved', 'Cleaning', 'Maintenance', 'Blocked'] },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  { key: 'auditTrail', label: 'Audit Trail', type: 'textarea', full: true },
];

const nursingFields = [
  { key: 'patientName', label: 'Patient', type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'patientId', label: 'Patient ID' },
  { key: 'ipdNo', label: 'IPD No' },
  { key: 'nurseName', label: 'Nurse', type: 'lookup', lookupModule: 'hospital/nurses' },
  { key: 'departmentName', label: 'Department', type: 'lookup', lookupModule: 'hospital/departments' },
  { key: 'name', label: 'Care Task / Shift', required: true },
  { key: 'shift', label: 'Shift', type: 'select', options: ['Morning', 'Evening', 'Night'] },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'fromTime', label: 'From Time' },
  { key: 'toTime', label: 'To Time' },
  { key: 'responsibility', label: 'Responsibility', type: 'select', options: ['Primary Nurse', 'Supporting Nurse', 'Medication Nurse', 'Procedure Nurse', 'Duty Doctor'] },
  { key: 'medicationAdministration', label: 'Medication Administration', type: 'textarea', full: true },
  { key: 'intakeOutput', label: 'Intake / Output', type: 'textarea', full: true },
  { key: 'handoverNotes', label: 'Handover Notes', type: 'textarea', full: true },
  { key: 'escalation', label: 'Escalation', type: 'select', options: ['None', 'Doctor Informed', 'Emergency Team', 'Family Informed'] },
  { key: 'status', label: 'Status', type: 'select', options: ['Assigned', 'In Care', 'Observed', 'Handover Pending', 'Completed', 'Cancelled'] },
  { key: 'notes', label: 'Nursing Notes', type: 'textarea', full: true },
  { key: 'auditTrail', label: 'Audit Trail', type: 'textarea', full: true },
];

const labFields = [
  { key: 'patientName', label: 'Patient', type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'patientId', label: 'Patient ID' },
  { key: 'visitNo', label: 'OPD/IPD/ER No' },
  { key: 'orderId', label: 'Order ID' },
  { key: 'name', label: 'Test / Report', required: true },
  { key: 'doctorName', label: 'Doctor', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'priority', label: 'Priority', type: 'select', options: ['Routine', 'Urgent', 'Critical'] },
  { key: 'source', label: 'Source', type: 'select', options: ['OPD', 'IPD', 'Emergency', 'Health Package', 'Direct'] },
  { key: 'sampleId', label: 'Sample ID' },
  { key: 'sampleType', label: 'Sample Type' },
  { key: 'container', label: 'Container' },
  { key: 'collectedAt', label: 'Collected At' },
  { key: 'collectedBy', label: 'Collected By' },
  { key: 'sampleCondition', label: 'Sample Condition', type: 'select', options: ['Acceptable', 'Hemolyzed', 'Insufficient', 'Leaked', 'Wrong Container', 'Rejected'] },
  { key: 'recollectionReason', label: 'Recollection Reason' },
  { key: 'result', label: 'Result', type: 'textarea', full: true },
  { key: 'referenceRange', label: 'Reference Range', type: 'textarea', full: true },
  { key: 'abnormalFlag', label: 'Abnormal Flag', type: 'select', options: ['Normal', 'Low', 'High', 'Critical'] },
  { key: 'enteredBy', label: 'Entered By' },
  { key: 'verifiedBy', label: 'Verified By' },
  { key: 'criticalAlertSent', label: 'Critical Alert Sent', type: 'select', options: ['No', 'Yes', 'Not Required'] },
  { key: 'turnaroundDueAt', label: 'TAT Due At' },
  { key: 'billingStatus', label: 'Billing Status', type: 'select', options: ['Pending', 'Billed', 'Paid', 'Waived'] },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Booked', 'Collected', 'Rejected', 'Processing', 'Result Entered', 'Verified', 'Reported', 'Cancelled'] },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  { key: 'auditTrail', label: 'Audit Trail', type: 'textarea', full: true },
];

const reportFields = [
  { key: 'name', label: 'Report Name', required: true },
  { key: 'period', label: 'Period' },
  { key: 'dateFrom', label: 'Date From', type: 'date' },
  { key: 'dateTo', label: 'Date To', type: 'date' },
  { key: 'departmentName', label: 'Department' },
  { key: 'doctorName', label: 'Doctor', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'patientType', label: 'Patient Type', type: 'select', options: ['All', 'OPD', 'IPD', 'Emergency', 'Direct'] },
  { key: 'sourceModules', label: 'Connected Modules', type: 'textarea', full: true },
  { key: 'drillDownRoute', label: 'Drill-down Route' },
  { key: 'exportFormats', label: 'Export Formats', type: 'select', options: ['PDF', 'Excel', 'PDF + Excel'] },
  { key: 'accessRole', label: 'Access Role', type: 'select', options: ['Admin', 'Doctor', 'Nurse', 'Billing', 'Pharmacy', 'Lab', 'All Authorized'] },
  { key: 'reviewedBy', label: 'Reviewed By' },
  { key: 'status', label: 'Status', type: 'select', options: ['Draft', 'Generated', 'Reviewed', 'Exported', 'Archived'] },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  { key: 'auditTrail', label: 'Audit Trail', type: 'textarea', full: true },
];

const billingFields = [
  { key: 'patientName', label: 'Patient', required: true, type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'patientId', label: 'Patient ID' },
  { key: 'visitNo', label: 'OPD/IPD/ER No' },
  { key: 'invoiceNo', label: 'Invoice No' },
  { key: 'name', label: 'Bill / Package / Estimate', required: true },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'billType', label: 'Bill Type', type: 'select', options: ['OPD', 'IPD', 'Diagnostics', 'Emergency', 'OT', 'Pharmacy', 'Other'] },
  { key: 'sourceModules', label: 'Source Modules', type: 'textarea', full: true },
  { key: 'amount', label: 'Amount', type: 'number' },
  { key: 'discountApproval', label: 'Discount Approval', type: 'select', options: ['Not Required', 'Pending', 'Approved', 'Rejected'] },
  { key: 'insuranceAmount', label: 'Insurance Amount', type: 'number' },
  { key: 'advanceAmount', label: 'Advance Amount', type: 'number' },
  { key: 'paidAmount', label: 'Paid Amount', type: 'number' },
  { key: 'balanceAmount', label: 'Balance Amount', type: 'number' },
  { key: 'paymentMode', label: 'Payment Mode', type: 'select', options: ['Cash', 'UPI', 'Card', 'Bank', 'Credit', 'Mixed'] },
  { key: 'receiptNo', label: 'Receipt No' },
  { key: 'refundStatus', label: 'Refund Status', type: 'select', options: ['Not Required', 'Pending', 'Processed', 'Rejected'] },
  { key: 'voidReason', label: 'Void / Cancel Reason' },
  { key: 'status', label: 'Status', type: 'select', options: ['Draft', 'Pending', 'Part Paid', 'Paid', 'Credit', 'Refunded', 'Voided', 'Cancelled'] },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  { key: 'auditTrail', label: 'Audit Trail', type: 'textarea', full: true },
];

const radiologyFields = [
  { key: 'patientName', label: 'Patient', type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'patientId', label: 'Patient ID' },
  { key: 'visitNo', label: 'OPD/IPD/ER No' },
  { key: 'orderId', label: 'Order ID' },
  { key: 'doctorName', label: 'Doctor', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'name', label: 'Scan / Report', required: true },
  { key: 'modality', label: 'Modality', type: 'select', options: ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'ECG'] },
  { key: 'bodyPart', label: 'Body Part' },
  { key: 'clinicalIndication', label: 'Clinical Indication', type: 'textarea', full: true },
  { key: 'priority', label: 'Priority', type: 'select', options: ['Routine', 'Urgent', 'Emergency'] },
  { key: 'scheduledAt', label: 'Scheduled At' },
  { key: 'imageAttachment', label: 'Image Attachment Ref' },
  { key: 'radiologist', label: 'Radiologist', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'date', label: 'Scan Date', type: 'date' },
  { key: 'findings', label: 'Findings', type: 'textarea', full: true },
  { key: 'impression', label: 'Impression', type: 'textarea', full: true },
  { key: 'verifiedBy', label: 'Verified By' },
  { key: 'reportLock', label: 'Report Lock', type: 'select', options: ['Unlocked', 'Final Locked'] },
  { key: 'billingStatus', label: 'Billing Status', type: 'select', options: ['Pending', 'Billed', 'Paid', 'Waived'] },
  { key: 'status', label: 'Status', type: 'select', options: ['Scheduled', 'In Scan', 'Reporting', 'Verified', 'Completed', 'Cancelled'] },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  { key: 'auditTrail', label: 'Audit Trail', type: 'textarea', full: true },
];

const pharmacyFields = [
  { key: 'patientName', label: 'Patient', type: 'lookup', lookupModule: 'hospital/patients' },
  { key: 'patientId', label: 'Patient ID' },
  { key: 'visitNo', label: 'OPD/IPD/ER No' },
  { key: 'prescriptionNo', label: 'Prescription No' },
  { key: 'invoiceNo', label: 'Invoice No' },
  { key: 'doctorName', label: 'Doctor', type: 'lookup', lookupModule: 'hospital/doctors' },
  { key: 'name', label: 'Medicine / Order', required: true },
  { key: 'genericName', label: 'Generic Name' },
  { key: 'requiredQuantity', label: 'Required Qty', type: 'number' },
  { key: 'quantity', label: 'Quantity', type: 'number' },
  { key: 'dispensedQuantity', label: 'Dispensed Qty', type: 'number' },
  { key: 'returnQuantity', label: 'Return Qty', type: 'number' },
  { key: 'batchNo', label: 'Batch No' },
  { key: 'manufacturer', label: 'Manufacturer' },
  { key: 'expiryDate', label: 'Expiry Date', type: 'date' },
  { key: 'fefoSuggestedBatch', label: 'FEFO Suggested Batch' },
  { key: 'expiryCheck', label: 'Expiry Check', type: 'select', options: ['Pending', 'Valid', 'Expiring Soon', 'Expired - Blocked'] },
  { key: 'substitutionAuthorized', label: 'Substitution Authorized', type: 'select', options: ['No', 'Yes', 'Not Required'] },
  { key: 'nonReturnable', label: 'Non-returnable', type: 'select', options: ['No', 'Yes'] },
  { key: 'returnReason', label: 'Return Reason', type: 'select', options: ['Excess Medicine', 'Doctor changed prescription', 'Treatment discontinued', 'Wrong item issued', 'Duplicate issue', 'Patient discharge', 'Other'] },
  { key: 'packageCondition', label: 'Package Condition', type: 'select', options: ['Sealed / Unopened', 'Opened', 'Damaged', 'Expired'] },
  { key: 'inventoryAction', label: 'Inventory Action', type: 'select', options: ['Pending', 'Deducted', 'Returned to Stock', 'Damaged / Rejected'] },
  { key: 'billingStatus', label: 'Billing Status', type: 'select', options: ['Pending', 'Billed', 'Paid', 'Added to IPD Bill', 'Refund Pending', 'Refunded'] },
  { key: 'date', label: 'Date', type: 'date' },
  { key: 'status', label: 'Status', type: 'select', options: ['Ordered', 'Verified', 'Partially Dispensed', 'Dispensed', 'Returned', 'Blocked', 'Cancelled'] },
  { key: 'notes', label: 'Notes', type: 'textarea', full: true },
  { key: 'patientInstructions', label: 'Patient Instructions', type: 'textarea', full: true },
  { key: 'auditTrail', label: 'Audit Trail', type: 'textarea', full: true },
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

  { path: '/hospital/book-appointment', element: <BookAppointmentPage /> },
  { path: '/hospital/appointment-calendar', element: <AppointmentCalendarPage /> },
  { path: '/hospital/doctor-schedule', element: <DoctorSchedulePage /> },
  { path: '/hospital/queue-management', element: <QueueTokenPage /> },
  { path: '/hospital/token-system', element: <QueueTokenPage /> },
  { path: '/hospital/queue-token', element: <QueueTokenPage /> },
  recordRoute('/hospital/follow-up-appointments', 'hospital/appointments', 'Follow-up Appointments', 'Appointment Management', appointmentFields, 'SMS/WhatsApp reminders', { mode: 'schedule' }),

  recordRoute('/hospital/op-registration', 'hospital/opd-visits', 'OP Registration', 'OPD', opdFields, 'Consultation workflow', { columns: ['Registered', 'In Consultation', 'Diagnosed', 'Prescribed', 'Procedure Done', 'Follow-up'] }),
  { path: '/hospital/consultation', element: <ConsultationPage /> },
  { path: '/hospital/diagnosis', element: <DiagnosisPage /> },
  { path: '/hospital/prescription', element: <PrescriptionPage /> },
  { path: '/hospital/procedures', element: <ProceduresPage /> },
  { path: '/hospital/follow-up', element: <FollowUpPlanPage /> },

  { path: '/hospital/admission', element: <AdmissionPage /> },
  { path: '/hospital/inpatients', element: <InpatientsPage /> },
  { path: '/hospital/ward-room-bed', element: <WardRoomsPage /> },
  { path: '/hospital/bed-allocation', element: <BedAllocationPage /> },
  { path: '/hospital/transfer', element: <TransferPage /> },
  recordRoute('/hospital/treatment-plan', 'hospital/ipd-admissions', 'Treatment Plan', 'IPD', ipdFields, 'Track treatment', { columns: ['Admitted', 'Bed Allocated', 'Treatment Planned', 'In Progress', 'Nursing Review', 'Ready for Discharge', 'Discharged'] }),
  recordRoute('/hospital/daily-progress', 'hospital/ipd-admissions', 'Daily Progress', 'IPD', ipdFields, 'Track treatment', { columns: ['Admitted', 'Bed Allocated', 'Treatment Planned', 'In Progress', 'Nursing Review', 'Ready for Discharge', 'Discharged'] }),
  recordRoute('/hospital/nursing-notes', 'hospital/ipd-admissions', 'Nursing Notes', 'IPD', ipdFields, 'Track treatment', { columns: ['Admitted', 'Bed Allocated', 'Treatment Planned', 'In Progress', 'Nursing Review', 'Ready for Discharge', 'Discharged'] }),
  { path: '/hospital/discharge-summary', element: <DischargeWorkflowPage /> },

  { path: '/hospital/emergency-registration', element: <EmergencyRegistrationPage /> },
  { path: '/hospital/triage', element: <TriagePage /> },
  { path: '/hospital/emergency-cases', element: <EmergencyCasesPage /> },
  recordRoute('/hospital/casualty', 'hospital/emergency-cases', 'Casualty', 'Emergency', emergencyFields, 'Emergency workflow'),
  recordRoute('/hospital/critical-care', 'hospital/emergency-cases', 'Critical Care', 'Emergency', emergencyFields, 'Emergency workflow'),
  { path: '/hospital/surgery-schedule', element: <SurgerySchedulePage /> },
  { path: '/hospital/ot-booking', element: <OTBookingPage /> },
  { path: '/hospital/operation-notes', element: <OperationNotesPage /> },

  recordRoute('/hospital/doctors', 'hospital/doctors', 'Doctor List', 'Doctors', doctorFields, 'Manage doctors'),
  recordRoute('/hospital/specializations', 'hospital/doctors', 'Specializations', 'Doctors', doctorFields, 'Manage doctors'),
  { path: '/hospital/doctor-availability', element: <DoctorSchedulePage /> },
  { path: '/hospital/doctor-schedule-management', element: <DoctorSchedulePage /> },
  recordRoute('/hospital/consultation-fees', 'hospital/doctors', 'Consultation Fees', 'Doctors', doctorFields, 'Consultation tracking'),

  { path: '/hospital/nurse-list', element: <NursesPage /> },
  { path: '/hospital/shift-allocation', element: <ShiftAllocationPage /> },
  { path: '/hospital/patient-assignment', element: <PatientAssignmentPage /> },
  recordRoute('/hospital/nursing-care-notes', 'hospital/nursing-care', 'Nursing Notes', 'Nursing', nursingFields, 'Patient care records'),

  recordRoute('/hospital/wards', 'hospital/bed-management', 'Wards', 'Ward & Bed Management', bedFields, 'Live availability'),
  recordRoute('/hospital/rooms', 'hospital/bed-management', 'Rooms', 'Ward & Bed Management', bedFields, 'Live availability'),
  recordRoute('/hospital/beds', 'hospital/bed-management', 'Beds', 'Ward & Bed Management', bedFields, 'Bed allocation'),
  recordRoute('/hospital/icu', 'hospital/bed-management', 'ICU', 'Ward & Bed Management', bedFields, 'Bed allocation'),
  recordRoute('/hospital/nicu', 'hospital/bed-management', 'NICU', 'Ward & Bed Management', bedFields, 'Bed allocation'),
  recordRoute('/hospital/occupancy', 'hospital/bed-management', 'Occupancy', 'Ward & Bed Management', bedFields, 'Live availability'),

  { path: '/hospital/laboratory', element: <LaboratoryPage /> },
  { path: '/hospital/test-categories', element: <LaboratoryPage /> },
  recordRoute('/hospital/test-booking', 'hospital/lab-workflow', 'Test Booking', 'Laboratory', labFields, 'Lab workflow'),
  recordRoute('/hospital/sample-collection', 'hospital/lab-workflow', 'Sample Collection', 'Laboratory', labFields, 'Lab workflow'),
  recordRoute('/hospital/test-results', 'hospital/lab-workflow', 'Test Results', 'Laboratory', labFields, 'Report generation'),
  recordRoute('/hospital/lab-reports', 'hospital/lab-workflow', 'Reports', 'Laboratory', labFields, 'Doctor access'),

  recordRoute('/hospital/x-ray', 'hospital/radiology-workflow', 'X-Ray', 'Radiology', radiologyFields, 'Scan scheduling', { radiology: true }),
  { path: '/hospital/radiology', element: <RadiologyPage /> },
  recordRoute('/hospital/ct-scan', 'hospital/radiology-workflow', 'CT Scan', 'Radiology', radiologyFields, 'Scan scheduling', { radiology: true }),
  recordRoute('/hospital/mri', 'hospital/radiology-workflow', 'MRI', 'Radiology', radiologyFields, 'Scan scheduling', { radiology: true }),
  recordRoute('/hospital/ultrasound', 'hospital/radiology-workflow', 'Ultrasound', 'Radiology', radiologyFields, 'Scan scheduling', { radiology: true }),
  recordRoute('/hospital/ecg', 'hospital/radiology-workflow', 'ECG', 'Radiology', radiologyFields, 'Scan scheduling', { radiology: true }),
  { path: '/hospital/radiology-reports', element: <ScanReportsPage /> },

  { path: '/hospital/medicine-dispensing', element: <MedicineDispensingPage /> },
  { path: '/hospital/pharmacy/medicine-dispensing', element: <MedicineDispensingPage /> },
  { path: '/hospital/prescription-orders', element: <PrescriptionsQueuePage /> },
  { path: '/hospital/pharmacy/prescription-orders', element: <PrescriptionsQueuePage /> },
  { path: '/hospital/medicine-returns', element: <MedicineReturnsPage /> },
  { path: '/hospital/pharmacy/medicine-returns', element: <MedicineReturnsPage /> },
  recordRoute('/hospital/batch-tracking', 'hospital/pharmacy-dispensing', 'Batch Tracking', 'Pharmacy', pharmacyFields, 'Track issued medicines'),
  { path: '/hospital/batch-expiry', element: <BatchExpiryPage /> },
  { path: '/hospital/pharmacy/batch-expiry', element: <BatchExpiryPage /> },
  recordRoute('/hospital/expiry-alerts', 'hospital/pharmacy-dispensing', 'Expiry Alerts', 'Pharmacy', pharmacyFields, 'Track expiring issued medicines'),

  { path: '/hospital/new-bill', element: <NewBillPage /> },
  { path: '/hospital/pharmacy-billing', element: <PharmacyBillingPage /> },
  { path: '/hospital/pharmacy/pharmacy-billing', element: <PharmacyBillingPage /> },
  { path: '/hospital/bills-invoices', element: <BillsInvoicesPage /> },
  { path: '/hospital/payments', element: <HospitalPaymentsPage /> },
  { path: '/hospital/outstanding', element: <OutstandingPage /> },
  { path: '/hospital/refunds', element: <RefundsPage /> },
  { path: '/hospital/packages', element: <PackagesPage /> },
  { path: '/hospital/estimates', element: <EstimatesPage /> },

  { path: '/hospital/patient-reports', element: <HospitalReportsPage type="patient" /> },
  { path: '/hospital/opd-reports', element: <HospitalReportsPage type="opd" /> },
  { path: '/hospital/ipd-reports', element: <HospitalReportsPage type="ipd" /> },
  { path: '/hospital/doctor-reports', element: <HospitalReportsPage type="doctor" /> },
  { path: '/hospital/diagnostics-reports', element: <HospitalReportsPage type="diagnostics" /> },
  { path: '/hospital/pharmacy-reports', element: <HospitalReportsPage type="pharmacy" /> },
  { path: '/hospital/billing-reports', element: <HospitalReportsPage type="billing" /> },
  { path: '/hospital/bed-occupancy-reports', element: <HospitalReportsPage type="bed" /> },
  { path: '/hospital/occupancy-clinical-reports', element: <HospitalReportsPage type="occupancyClinical" /> },
];

export const hospitalRoutes = [
  ...requestedHospitalRoutes,
  ...patientManagementRoutes,
  ...clinicalRoutes,
  ...laboratoryRoutes,
  ...pharmacyRoutes,
  ...medicalBillingRoutes,
];

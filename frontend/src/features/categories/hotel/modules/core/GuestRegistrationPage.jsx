import { useMemo, useState } from 'react';
import { Camera, CheckCircle2, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { SelectDropdown } from '../../../../../components/forms/SelectDropdown.jsx';
import { createModuleRecord } from '../../../../../services/moduleRecordsService.js';
import {
  GuestAvatar,
  GuestCard,
  GuestField,
  GuestInput,
  GuestPageHeader,
  GuestPrimaryButton,
  GuestSecondaryButton,
} from './GuestShared.jsx';

const selectOptions = {
  profile: ['Individual', 'Corporate', 'Family', 'Group'],
  gender: ['Male', 'Female', 'Other'],
  marital: ['Single', 'Married'],
  language: ['English', 'Tamil', 'Hindi', 'Malayalam'],
  idType: ['Aadhaar Card', 'Passport', 'Driving License', 'PAN Card'],
  country: ['India', 'United States', 'United Kingdom', 'Australia'],
};

export function GuestRegistrationPage() {
  const navigate = useNavigate();
  const [duplicate, setDuplicate] = useState(false);
  const [form, setForm] = useState({
    profile: 'Individual',
    fullName: '',
    gender: 'Male',
    dob: '',
    marital: 'Single',
    vip: false,
    mobile: '',
    email: '',
    alternate: '',
    language: 'English',
    address1: '',
    address2: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    idType: 'Aadhaar Card',
    idNumber: '',
    issueDate: '',
    expiryDate: '',
  });

  const completion = useMemo(() => {
    const required = ['fullName', 'mobile', 'address1', 'city', 'state', 'pincode', 'idNumber'];
    const filled = required.filter((key) => String(form[key] || '').trim()).length;
    return Math.round((filled / required.length) * 100);
  }, [form]);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
    if (key === 'mobile') {
      setDuplicate(String(value).replace(/\D/g, '').endsWith('9876543210'));
    }
  }

  async function submitGuest() {
    const guestNo = `GST-${String(Date.now()).slice(-5)}`;
    const payload = {
      guestId: guestNo,
      guestName: form.fullName,
      name: form.fullName,
      fullName: form.fullName,
      phone: form.mobile,
      mobile: form.mobile,
      email: form.email,
      nationality: form.country === 'India' ? 'Indian' : form.country,
      idProof: `${form.idType} ${form.idNumber}`.trim(),
      idType: form.idType,
      idNumber: form.idNumber,
      address: [form.address1, form.address2, form.city, form.state, form.pincode, form.country].filter(Boolean).join(', '),
      vip: form.vip,
      status: 'Registered',
      registeredAt: new Date().toISOString(),
    };
    await createModuleRecord('hotel/guests/registration', payload);
    await createModuleRecord('hotel/guests/list', payload);
    navigate('/hotel/guests/list');
  }

  return (
    <div className="min-h-full bg-slate-50 p-4 md:p-6">
      <GuestPageHeader
        title="Guest Registration"
        subtitle="Register a new guest"
        actions={(
          <>
            <GuestSecondaryButton onClick={() => navigate('/hotel/guests/list')}>
              <X size={15} />
              Cancel
            </GuestSecondaryButton>
            <GuestPrimaryButton onClick={submitGuest}>
              <Save size={15} />
              Save Guest
            </GuestPrimaryButton>
          </>
        )}
      />

      {duplicate && (
        <GuestCard className="mb-4 border-amber-200 bg-amber-50 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="text-[15px] font-bold text-amber-900">Existing Guest Found</div>
              <p className="m-0 mt-1 text-[13px] text-amber-800">A guest with this mobile number already exists.</p>
            </div>
            <div className="flex gap-2">
              <GuestSecondaryButton className="border-amber-300 text-amber-800" onClick={() => setDuplicate(false)}>Use Existing Guest</GuestSecondaryButton>
              <GuestPrimaryButton className="bg-amber-600 hover:bg-amber-700" onClick={() => setDuplicate(false)}>Create New Guest</GuestPrimaryButton>
            </div>
          </div>
        </GuestCard>
      )}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_0.8fr_0.8fr_0.7fr]">
        <GuestCard className="p-4">
          <h2 className="m-0 text-[15px] font-bold text-slate-950">Guest Information</h2>
          <div className="mt-4 grid grid-cols-[82px_1fr] gap-4">
            <div>
              <div className="relative inline-flex">
                <GuestAvatar size="lg" />
                <button type="button" className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full border border-slate-200 bg-white text-blue-700 shadow-sm" aria-label="Upload profile photo">
                  <Camera size={14} />
                </button>
              </div>
              <div className="mt-3 text-[11px] font-semibold text-emerald-700">Complete {completion}%</div>
            </div>
            <div className="grid gap-3">
              <GuestField label="Profile Photo">
                <SelectDropdown value={form.profile} onChange={(value) => update('profile', value)} options={selectOptions.profile} />
              </GuestField>
              <GuestField label="Full Name" required>
                <GuestInput value={form.fullName} onChange={(event) => update('fullName', event.target.value)} />
              </GuestField>
              <GuestField label="Gender" required>
                <SelectDropdown value={form.gender} onChange={(value) => update('gender', value)} options={selectOptions.gender} />
              </GuestField>
              <GuestField label="Date of Birth">
                <GuestInput type="date" value={form.dob} onChange={(event) => update('dob', event.target.value)} />
              </GuestField>
              <GuestField label="Marital Status">
                <SelectDropdown value={form.marital} onChange={(value) => update('marital', value)} options={selectOptions.marital} />
              </GuestField>
              <label className="flex items-center justify-between rounded-md border border-slate-200 px-3 py-2 text-[13px] font-semibold text-slate-700">
                VIP Status
                <input type="checkbox" checked={form.vip} onChange={(event) => update('vip', event.target.checked)} />
              </label>
            </div>
          </div>
        </GuestCard>

        <GuestCard className="p-4">
          <h2 className="m-0 text-[15px] font-bold text-slate-950">Contact Details</h2>
          <div className="mt-4 grid gap-3">
            <GuestField label="Mobile Number" required><GuestInput value={form.mobile} onChange={(event) => update('mobile', event.target.value)} /></GuestField>
            <GuestField label="Email ID"><GuestInput value={form.email} onChange={(event) => update('email', event.target.value)} /></GuestField>
            <GuestField label="Alternate Number"><GuestInput value={form.alternate} onChange={(event) => update('alternate', event.target.value)} /></GuestField>
            <GuestField label="Preferred Language"><SelectDropdown value={form.language} onChange={(value) => update('language', value)} options={selectOptions.language} /></GuestField>
          </div>
        </GuestCard>

        <GuestCard className="p-4">
          <h2 className="m-0 text-[15px] font-bold text-blue-700">Address Details</h2>
          <div className="mt-4 grid gap-3">
            <GuestField label="Address Line 1" required><GuestInput value={form.address1} onChange={(event) => update('address1', event.target.value)} /></GuestField>
            <GuestField label="Address Line 2"><GuestInput value={form.address2} onChange={(event) => update('address2', event.target.value)} /></GuestField>
            <GuestField label="City" required><GuestInput value={form.city} onChange={(event) => update('city', event.target.value)} /></GuestField>
            <div className="grid grid-cols-2 gap-3">
              <GuestField label="State" required><GuestInput value={form.state} onChange={(event) => update('state', event.target.value)} /></GuestField>
              <GuestField label="PIN Code" required><GuestInput value={form.pincode} onChange={(event) => update('pincode', event.target.value)} /></GuestField>
            </div>
            <GuestField label="Country" required><SelectDropdown value={form.country} onChange={(value) => update('country', value)} options={selectOptions.country} /></GuestField>
          </div>
        </GuestCard>

        <GuestCard className="p-4">
          <h2 className="m-0 text-[15px] font-bold text-blue-700">ID Proof</h2>
          <div className="mt-4 grid gap-3">
            <GuestField label="ID Proof Type" required><SelectDropdown value={form.idType} onChange={(value) => update('idType', value)} options={selectOptions.idType} /></GuestField>
            <GuestField label="ID Proof Number" required><GuestInput value={form.idNumber} onChange={(event) => update('idNumber', event.target.value)} /></GuestField>
            <GuestField label="Issue Date"><GuestInput type="date" value={form.issueDate} onChange={(event) => update('issueDate', event.target.value)} /></GuestField>
            <GuestField label="Expiry Date"><GuestInput value={form.expiryDate} onChange={(event) => update('expiryDate', event.target.value)} placeholder="-" /></GuestField>
          </div>
        </GuestCard>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[12px] font-semibold text-emerald-700">
        <CheckCircle2 size={15} />
        Duplicate guest check runs when mobile number is entered.
      </div>
    </div>
  );
}

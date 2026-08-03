import { redirectTo } from '../../routes/navigation.js';
import { useMemo, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Building2, Car, CheckCircle2, CreditCard, Eye, EyeOff,
  Factory, GraduationCap, HardHat, Hospital, Lock, Mail, Phone, RefreshCw,
  Rocket, ShieldCheck, Store, User, Users, Wallet,
} from 'lucide-react';

import { CATEGORIES } from '../../constants/categories.js';
import { sendRegisterOtp, verifyRegisterOtp } from '../../services/authService.js';
import { AuthLayout } from './AuthLayout.jsx';
import { CHECKBOX_TEXT, ERROR_BOX, ERROR_TEXT, EYE_BUTTON, HEADING, ICON, INPUT, LABEL, MUTED, SUBTEXT } from './authTheme.jsx';

const CATEGORY_ICONS = {
  Store, GraduationCap, Hospital, Building2, Factory, HardHat, Users, Car, Wallet,
};

const PLANS = [
  { value: 'starter', label: 'Starter', amount: 499, price: 'Rs. 499', note: 'Basic billing and records' },
  { value: 'professional', label: 'Professional', amount: 999, price: 'Rs. 999', note: 'Full business modules' },
  { value: 'enterprise', label: 'Enterprise', amount: 1999, price: 'Rs. 1,999', note: 'Advanced controls' },
];

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[A-Za-z][A-Za-z .'-]{1,}$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const STEPS = ['Welcome', 'Company', 'Category', 'Account', 'Plan', 'Verify'];

function validateCompanyStep(form) {
  const errs = {};
  if (!form.businessName.trim()) errs.businessName = 'Business name is required';
  else if (form.businessName.trim().length < 2) errs.businessName = 'Business name must be at least 2 characters';

  if (form.gstin.trim() && !GSTIN_REGEX.test(form.gstin.trim().toUpperCase())) errs.gstin = 'Enter a valid 15-character GSTIN';

  const phoneDigits = form.phone.replace(/\D/g, '').slice(-10);
  if (!form.phone.trim()) errs.phone = 'Phone number is required';
  else if (!/^[6-9]\d{9}$/.test(phoneDigits)) errs.phone = 'Enter a valid 10-digit mobile number';

  if (!form.email.trim()) errs.email = 'Email is required';
  else if (!EMAIL_REGEX.test(form.email.trim())) errs.email = 'Enter a valid email address';

  return errs;
}

function validateCategoryStep(form) {
  return form.category ? {} : { category: 'Select a category' };
}

function validateAccountStep(form) {
  const errs = {};
  if (!form.name.trim()) errs.name = 'Full name is required';
  else if (!NAME_REGEX.test(form.name.trim())) errs.name = 'Enter a valid name (letters only, min 2 characters)';

  if (!form.password) errs.password = 'Password is required';
  else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
  else if (!/[A-Za-z]/.test(form.password) || !/[0-9]/.test(form.password)) errs.password = 'Password must include at least one letter and one number';

  if (!form.confirmPassword) errs.confirmPassword = 'Please confirm your password';
  else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';

  if (!form.acceptTerms) errs.acceptTerms = 'You must accept the Terms of Service and Privacy Policy';
  return errs;
}

function validatePlanStep(form) {
  return form.subscriptionPlan ? {} : { subscriptionPlan: 'Choose a plan' };
}

function FieldError({ message }) {
  if (!message) return null;
  return <span className={`block mt-1.5 text-[11.5px] ${ERROR_TEXT}`}>{message}</span>;
}

function StepProgress({ step }) {
  return (
    <div className="flex items-center justify-center gap-1.5 mb-5" aria-label={`Step ${step + 1} of ${STEPS.length}`}>
      {STEPS.map((label, i) => (
        <div key={label} className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full transition-colors ${i <= step ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`} />
          {i < STEPS.length - 1 && <div className={`w-4 sm:w-6 h-[2px] rounded-full transition-colors ${i < step ? 'bg-blue-500' : 'bg-slate-200 dark:bg-slate-700'}`} />}
        </div>
      ))}
    </div>
  );
}

function BackButton({ onClick }) {
  return (
    <button type="button" onClick={onClick} className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 bg-transparent border-0 cursor-pointer p-0 mb-4">
      <ArrowLeft size={14} /> Back
    </button>
  );
}

function PrimaryButton({ children, disabled, type = 'button', onClick, tone = 'blue' }) {
  const background = tone === 'green' ? 'linear-gradient(135deg, #0d9488 0%, #059669 100%)' : 'linear-gradient(135deg, #4f90ff 0%, #6366f1 100%)';
  return (
    <button type={type} onClick={onClick} disabled={disabled} className="w-full flex items-center justify-center gap-2.5 rounded-xl px-4 py-3.5 text-white font-bold text-[15px] border-0 cursor-pointer transition-all duration-150 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed mt-1" style={{ background, boxShadow: '0 6px 24px -4px rgba(79,144,255,0.45)' }}>
      {children}
    </button>
  );
}

function WelcomeStep({ onNext }) {
  return (
    <div className="text-center">
      <div className="flex justify-center mb-5"><div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-blue-500/10"><Rocket size={28} style={{ color: '#3b6dff' }} /></div></div>
      <h2 className={`text-[22px] font-bold m-0 mb-2 ${HEADING}`}>Welcome to GoBook</h2>
      <p className="text-[13.5px] font-semibold m-0 mb-3" style={{ color: '#3b6dff' }}>Universal Business Operating Platform</p>
      <p className={`text-[13px] leading-relaxed m-0 mb-7 ${SUBTEXT}`}>Set up your workspace in a few quick steps. Email OTP verification happens before your account is created.</p>
      <PrimaryButton onClick={onNext}>Get Started <ArrowRight size={18} /></PrimaryButton>
      <p className={`text-center text-[12.5px] mt-5 mb-0 ${MUTED}`}>Already have an account? <a href="/login" className="font-bold no-underline hover:underline" style={{ color: '#4f90ff' }}>Sign In</a></p>
    </div>
  );
}

function CompanyDetailsStep({ form, errors, set, onNext, onBack }) {
  return (
    <div>
      <BackButton onClick={onBack} />
      <div className="mb-5"><h2 className={`text-[19px] font-bold m-0 mb-1 ${HEADING}`}>Company Registration</h2><p className={`text-[13px] m-0 ${SUBTEXT}`}>Enter business and contact details</p></div>
      <div className="flex flex-col gap-3.5">
        <div><label htmlFor="businessName" className={LABEL}>Company Name</label><div className="relative"><Building2 size={15} className={ICON} /><input id="businessName" type="text" placeholder="Company name" value={form.businessName} onChange={set('businessName')} className={`${INPUT} ${errors.businessName ? 'border-red-400' : ''}`} /></div><FieldError message={errors.businessName} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label htmlFor="phone" className={LABEL}>Phone Number</label><div className="relative"><Phone size={15} className={ICON} /><input id="phone" type="tel" placeholder="98765 43210" value={form.phone} onChange={set('phone')} className={`${INPUT} ${errors.phone ? 'border-red-400' : ''}`} /></div><FieldError message={errors.phone} /></div>
          <div><label htmlFor="gstin" className={LABEL}>GSTIN <span className={MUTED}>(Optional)</span></label><div className="relative"><ShieldCheck size={15} className={ICON} /><input id="gstin" type="text" placeholder="33AABCA1234A1Z5" maxLength={15} value={form.gstin} onChange={set('gstin')} className={`${INPUT} uppercase ${errors.gstin ? 'border-red-400' : ''}`} /></div><FieldError message={errors.gstin} /></div>
        </div>
        <div><label htmlFor="email" className={LABEL}>Email</label><div className="relative"><Mail size={15} className={ICON} /><input id="email" type="email" placeholder="you@company.com" value={form.email} onChange={set('email')} className={`${INPUT} ${errors.email ? 'border-red-400' : ''}`} /></div><FieldError message={errors.email} /></div>
        <PrimaryButton onClick={onNext}>Next <ArrowRight size={18} /></PrimaryButton>
      </div>
    </div>
  );
}

function CategoryStep({ form, errors, setCategory, onNext, onBack }) {
  return (
    <div>
      <BackButton onClick={onBack} />
      <div className="mb-5"><h2 className={`text-[19px] font-bold m-0 mb-1 ${HEADING}`}>Select Business Type</h2><p className={`text-[13px] m-0 ${SUBTEXT}`}>Choose the category for your modules</p></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2">
        {CATEGORIES.map(({ value, label, icon }) => {
          const Icon = CATEGORY_ICONS[icon];
          const selected = form.category === value;
          return (
            <button key={value} type="button" onClick={() => setCategory(value)} className={`min-h-[82px] flex flex-col items-center justify-center gap-2 rounded-xl px-2 py-3 border cursor-pointer transition-all ${selected ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300'}`}>
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${selected ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}>{Icon && <Icon size={16} />}</span>
              <span className={`text-[11.5px] font-semibold text-center leading-tight ${selected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>{label}</span>
            </button>
          );
        })}
      </div>
      <FieldError message={errors.category} />
      <PrimaryButton onClick={onNext} tone="green">Continue <ArrowRight size={18} /></PrimaryButton>
    </div>
  );
}

function AccountStep({ form, errors, set, showPassword, setShowPassword, onBack, onNext }) {
  return (
    <div>
      <BackButton onClick={onBack} />
      <div className="mb-5"><h2 className={`text-[19px] font-bold m-0 mb-1 ${HEADING}`}>Create Your Login</h2><p className={`text-[13px] m-0 ${SUBTEXT}`}>Set up the owner password</p></div>
      <div className="flex flex-col gap-3.5">
        <div><label htmlFor="name" className={LABEL}>Full Name</label><div className="relative"><User size={15} className={ICON} /><input id="name" type="text" placeholder="Your name" value={form.name} onChange={set('name')} className={`${INPUT} ${errors.name ? 'border-red-400' : ''}`} /></div><FieldError message={errors.name} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label htmlFor="password" className={LABEL}>Password</label><div className="relative"><Lock size={15} className={ICON} /><input id="password" type={showPassword ? 'text' : 'password'} placeholder="Min 8 characters" value={form.password} onChange={set('password')} className={`${INPUT} pr-11 ${errors.password ? 'border-red-400' : ''}`} /><button type="button" onClick={() => setShowPassword((s) => !s)} aria-label={showPassword ? 'Hide password' : 'Show password'} className={`absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer bg-transparent border-0 p-0 flex items-center ${EYE_BUTTON}`}>{showPassword ? <EyeOff size={14} /> : <Eye size={14} />}</button></div><FieldError message={errors.password} /></div>
          <div><label htmlFor="confirmPassword" className={LABEL}>Confirm Password</label><div className="relative"><Lock size={15} className={ICON} /><input id="confirmPassword" type={showPassword ? 'text' : 'password'} placeholder="Re-enter password" value={form.confirmPassword} onChange={set('confirmPassword')} className={`${INPUT} ${errors.confirmPassword ? 'border-red-400' : ''}`} /></div><FieldError message={errors.confirmPassword} /></div>
        </div>
        <div><label className={`flex items-start gap-2.5 text-[12.5px] cursor-pointer select-none ${CHECKBOX_TEXT}`}><input type="checkbox" checked={form.acceptTerms} onChange={set('acceptTerms')} className="mt-0.5 w-4 h-4 rounded accent-blue-500 cursor-pointer flex-none" /><span>I agree to the <a href="/terms" className="font-semibold no-underline hover:underline" style={{ color: '#4f90ff' }}>Terms of Service</a> and <a href="/privacy" className="font-semibold no-underline hover:underline" style={{ color: '#4f90ff' }}>Privacy Policy</a></span></label><FieldError message={errors.acceptTerms} /></div>
        <PrimaryButton onClick={onNext}>Choose Plan <ArrowRight size={18} /></PrimaryButton>
      </div>
    </div>
  );
}

function PlanStep({ form, errors, setPlan, error, submitting, onBack, onSubmit }) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <BackButton onClick={onBack} />
      <div className="mb-1"><h2 className={`text-[19px] font-bold m-0 mb-1 ${HEADING}`}>Choose Plan</h2><p className={`text-[13px] m-0 ${SUBTEXT}`}>Same plan and price flow as Google signup</p></div>
      {PLANS.map((plan) => (
        <button key={plan.value} type="button" onClick={() => setPlan(plan)} className={`min-h-[74px] rounded-xl border px-3 text-left cursor-pointer flex items-center justify-between gap-3 ${form.subscriptionPlan === plan.value ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800'}`}>
          <span><span className={`block text-[13px] font-extrabold leading-tight ${HEADING}`}>{plan.label}</span><span className={`block text-[11px] mt-0.5 leading-tight ${MUTED}`}>{plan.note}</span></span>
          <span className="text-right shrink-0"><span className={`block text-[17px] font-black leading-none ${HEADING}`}>{plan.price}</span><span className="block text-[10px] font-bold text-slate-400 mt-1">/ month</span></span>
        </button>
      ))}
      <FieldError message={errors.subscriptionPlan} />
      {error && <div className={`rounded-xl px-4 py-2.5 ${ERROR_BOX}`}><span className={`text-[12.5px] ${ERROR_TEXT}`}>{error}</span></div>}
      <PrimaryButton type="submit" disabled={submitting}><Mail size={18} />{submitting ? 'Sending OTP...' : 'Send OTP'}</PrimaryButton>
    </form>
  );
}

function OtpStep({ email, otp, setOtp, error, message, submitting, resending, onBack, onSubmit, onResend }) {
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <BackButton onClick={onBack} />
      <div className="text-center mb-2">
        <div className="w-12 h-12 rounded-2xl bg-blue-50 mx-auto mb-3 flex items-center justify-center text-blue-600"><Mail size={24} /></div>
        <h2 className={`text-[21px] font-bold m-0 mb-1 ${HEADING}`}>Verify Email</h2>
        <p className={`text-[12.5px] m-0 ${SUBTEXT}`}>Enter the OTP sent to your email</p>
        <p className={`text-[12px] m-0 mt-2 break-all ${MUTED}`}>{email}</p>
      </div>
      <input value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} className={`${INPUT} pl-3 text-center tracking-[8px] text-[20px] font-extrabold`} placeholder="000000" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required />
      {error && <div className={`rounded-xl px-3 py-2 ${ERROR_BOX}`}><span className={`text-[12px] ${ERROR_TEXT}`}>{error}</span></div>}
      {message && <div className="rounded-xl px-3 py-2 bg-emerald-50 text-emerald-700 text-[12px] border border-emerald-100">{message}</div>}
      <PrimaryButton type="submit" disabled={submitting || otp.length !== 6}><CheckCircle2 size={17} />{submitting ? 'Verifying...' : 'Verify and Create Account'}</PrimaryButton>
      <button type="button" onClick={onResend} disabled={resending} className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[12px] cursor-pointer disabled:opacity-60"><RefreshCw size={14} />{resending ? 'Sending...' : 'Resend OTP'}</button>
    </form>
  );
}

export function RegisterPage() {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    businessName: '', gstin: '', phone: '', email: '', category: '',
    name: '', password: '', confirmPassword: '', acceptTerms: false,
    subscriptionPlan: '', subscriptionAmount: 0,
  });
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [otp, setOtp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);

  const signupPayload = useMemo(() => ({
    name: form.name,
    email: form.email,
    password: form.password,
    businessName: form.businessName,
    category: form.category,
    phone: form.phone,
    gstin: form.gstin.trim().toUpperCase(),
    subscriptionPlan: form.subscriptionPlan,
    subscriptionAmount: form.subscriptionAmount,
  }), [form]);

  function set(field) {
    return (e) => {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      setForm((f) => ({ ...f, [field]: value }));
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    };
  }

  function goNext(validate) {
    const validationErrors = validate(form);
    setErrors(validationErrors);
    setError('');
    if (Object.keys(validationErrors).length > 0) return;
    setStep((s) => s + 1);
  }

  function goBack() {
    setErrors({});
    setError('');
    setMessage('');
    setStep((s) => Math.max(0, s - 1));
  }

  function choosePlan(plan) {
    setForm((current) => ({ ...current, subscriptionPlan: plan.value, subscriptionAmount: plan.amount }));
    setErrors((current) => {
      if (!current.subscriptionPlan) return current;
      const next = { ...current };
      delete next.subscriptionPlan;
      return next;
    });
  }

  async function handleSendOtp(event) {
    event.preventDefault();
    const validationErrors = validatePlanStep(form);
    setErrors(validationErrors);
    setError('');
    setMessage('');
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      const data = await sendRegisterOtp(signupPayload);
      setOtp('');
      setMessage(data.message || 'OTP sent to your email');
      setStep(5);
    } catch (err) {
      setError(err.message || 'Unable to send OTP');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerifyOtp(event) {
    event.preventDefault();
    setError('');
    setMessage('');
    setSubmitting(true);
    try {
      await verifyRegisterOtp({ email: form.email, otp });
      redirectTo('/dashboard');
    } catch (err) {
      setError(err.message || 'Invalid OTP');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleResendOtp() {
    setError('');
    setMessage('');
    setResending(true);
    try {
      const data = await sendRegisterOtp(signupPayload);
      setOtp('');
      setMessage(data.message || 'OTP sent again');
    } catch (err) {
      setError(err.message || 'Unable to resend OTP');
    } finally {
      setResending(false);
    }
  }

  return (
    <AuthLayout cardMaxWidth={500}>
      <div className="flex justify-center mb-4"><div className="inline-flex bg-white rounded-2xl px-4 py-2.5"><img src="/gobook-logo-full.png" alt="GoBook" className="h-9 sm:h-10 w-auto object-contain" /></div></div>
      {step > 0 && <StepProgress step={step} />}
      {step === 0 && <WelcomeStep onNext={() => setStep(1)} />}
      {step === 1 && <CompanyDetailsStep form={form} errors={errors} set={set} onNext={() => goNext(validateCompanyStep)} onBack={goBack} />}
      {step === 2 && <CategoryStep form={form} errors={errors} setCategory={(value) => set('category')({ target: { type: 'text', value } })} onNext={() => goNext(validateCategoryStep)} onBack={goBack} />}
      {step === 3 && <AccountStep form={form} errors={errors} set={set} showPassword={showPassword} setShowPassword={setShowPassword} onBack={goBack} onNext={() => goNext(validateAccountStep)} />}
      {step === 4 && <PlanStep form={form} errors={errors} setPlan={choosePlan} error={error} submitting={submitting} onBack={goBack} onSubmit={handleSendOtp} />}
      {step === 5 && <OtpStep email={form.email} otp={otp} setOtp={setOtp} error={error} message={message} submitting={submitting} resending={resending} onBack={goBack} onSubmit={handleVerifyOtp} onResend={handleResendOtp} />}
    </AuthLayout>
  );
}

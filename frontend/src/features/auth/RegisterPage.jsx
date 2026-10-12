import { redirectTo } from '../../routes/navigation.js';
import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  ArrowLeft, ArrowRight, Building2, Car, Check, CheckCircle2, ChevronDown, ChevronUp, CreditCard, Eye, EyeOff,
  Factory, GraduationCap, HardHat, Hospital, Lock, Mail, Phone, RefreshCw,
  ShieldCheck, Store, User, Users, Wallet,
} from 'lucide-react';

import { CATEGORIES, RETAIL_SUBCATEGORIES } from '../../constants/categories.js';
import { checkRegistrationEmailAvailability, sendRegisterOtp, startEmailOtpLogin, verifyEmailOtpLogin, verifyRegisterOtp } from '../../services/authService.js';
import { fetchSubscriptionPlans, openRazorpayCheckout, verifyRegistrationPayment } from '../../services/subscriptionService.js';
import { AuthLayout } from './AuthLayout.jsx';
import { CHECKBOX_TEXT, ERROR_BOX, ERROR_TEXT, EYE_BUTTON, HEADING, ICON, INPUT, LABEL, MUTED, SUBTEXT } from './authTheme.jsx';

const CATEGORY_ICONS = {
  Store, GraduationCap, Hospital, Building2, Factory, HardHat, Users, Car, Wallet,
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const NAME_REGEX = /^[A-Za-z][A-Za-z .'-]{1,}$/;
const GSTIN_REGEX = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
const SPECIAL_CHAR_REGEX = /[^A-Za-z0-9]/;
const preventPasswordPaste = (event) => event.preventDefault();

const STEPS = ['Account', 'Company', 'Category', 'Plan', 'Verify'];

function validateCompanyStep(form) {
  const errs = {};
  if (!form.businessName.trim()) errs.businessName = 'Business name is required';
  else if (form.businessName.trim().length < 2) errs.businessName = 'Business name must be at least 2 characters';

  if (form.gstin.trim() && !GSTIN_REGEX.test(form.gstin.trim().toUpperCase())) errs.gstin = 'Enter a valid 15-character GSTIN';
  if (form.state.trim().length > 60) errs.state = 'State is too long';
  if (form.city.trim().length > 60) errs.city = 'City is too long';

  return errs;
}

function validateCategoryStep(form) {
  const errs = {};
  if (!form.category) errs.category = 'Select a category';
  if (form.category === 'retail' && !form.retailSubcategory) errs.retailSubcategory = 'Select a retail subcategory';
  return errs;
}

function validateAccountIdentityStep(form) {
  const errs = {};
  if (!form.name.trim()) errs.name = 'Full name is required';
  else if (!NAME_REGEX.test(form.name.trim())) errs.name = 'Enter a valid name (letters only, min 2 characters)';

  const phoneDigits = form.phone.replace(/\D/g, '').slice(-10);
  if (!form.phone.trim()) errs.phone = 'Mobile number is required';
  else if (!/^[6-9]\d{9}$/.test(phoneDigits)) errs.phone = 'Enter a valid 10-digit mobile number';

  if (!form.email.trim()) errs.email = 'Email address is required';
  else if (!EMAIL_REGEX.test(form.email.trim())) errs.email = 'Enter a valid email address';

  return errs;
}

function validateAccountStep(form) {
  const errs = validateAccountIdentityStep(form);
  if (!form.password) errs.password = 'Password is required';
  else if (!isStrongPassword(form.password)) errs.password = 'Password must have 8 characters, 1 capital letter, 1 number, and 1 special character';

  if (!form.confirmPassword) errs.confirmPassword = 'Please confirm your password';
  else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';

  if (!form.acceptTerms) errs.acceptTerms = 'You must accept the Terms of Service and Privacy Policy';
  return errs;
}

function FieldError({ message }) {
  if (!message) return null;
  return <span className={`block mt-1.5 text-[11.5px] ${ERROR_TEXT}`}>{message}</span>;
}

function getPasswordChecks(password = '') {
  return [
    { key: 'length', label: '8 characters', passed: password.length >= 8 },
    { key: 'capital', label: '1 capital letter', passed: /[A-Z]/.test(password) },
    { key: 'number', label: '1 number', passed: /[0-9]/.test(password) },
    { key: 'special', label: '1 special character', passed: SPECIAL_CHAR_REGEX.test(password) },
  ];
}

function isStrongPassword(password = '') {
  return getPasswordChecks(password).every((item) => item.passed);
}

function PasswordRequirementPopover({ password, show }) {
  if (!show) return null;
  const checks = getPasswordChecks(password);
  const passedCount = checks.filter((item) => item.passed).length;
  const strong = passedCount === checks.length;

  return (
    <div className="absolute bottom-full left-0 z-30 mb-2 w-full max-w-[310px] rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-xl dark:border-slate-700 dark:bg-slate-900">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <span className={`text-[10.5px] font-extrabold uppercase tracking-wide ${strong ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
          {strong ? 'Strong password' : 'Required password'}
        </span>
        <span className={`text-[10.5px] font-bold ${strong ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>{passedCount}/4</span>
      </div>
      <div className="grid grid-cols-2 gap-x-2 gap-y-1">
        {checks.map((item) => (
          <span key={item.key} className={`inline-flex items-center gap-1.5 text-[11px] font-semibold ${item.passed ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-500 dark:text-slate-400'}`}>
            <span className={`inline-flex h-3.5 w-3.5 items-center justify-center rounded-full text-[8px] ${item.passed ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-300'}`}>
              {item.passed ? 'OK' : ''}
            </span>
            {item.label}
          </span>
        ))}
      </div>
      <span className="absolute left-6 top-full h-3 w-3 -translate-y-1.5 rotate-45 border-b border-r border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900" />
    </div>
  );
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

function CompanyDetailsStep({ form, errors, set, onNext, onBack, checkingEmail }) {
  return (
    <div>
      <BackButton onClick={onBack} />
      <div className="mb-5"><h2 className={`text-[19px] font-bold m-0 mb-1 ${HEADING}`}>Business Details</h2><p className={`text-[13px] m-0 ${SUBTEXT}`}>GSTIN is optional. Small and new businesses can continue trial without GSTIN.</p></div>
      <div className="flex flex-col gap-3.5">
        <div><label htmlFor="businessName" className={LABEL}>Business Name <span className="text-red-500">*</span></label><div className="relative"><Building2 size={15} className={ICON} /><input id="businessName" type="text" placeholder="Business name" value={form.businessName} onChange={set('businessName')} className={`${INPUT} ${errors.businessName ? 'border-red-400' : ''}`} /></div><FieldError message={errors.businessName} /></div>
        <div><label htmlFor="gstin" className={LABEL}>GSTIN <span className={MUTED}>Optional</span></label><div className="relative"><ShieldCheck size={15} className={ICON} /><input id="gstin" type="text" placeholder="33AABCA1234A1Z5" maxLength={15} value={form.gstin} onChange={set('gstin')} className={`${INPUT} uppercase ${errors.gstin ? 'border-red-400' : ''}`} /></div><FieldError message={errors.gstin} /></div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label htmlFor="state" className={LABEL}>State <span className={MUTED}>Optional</span></label><div className="relative"><input id="state" type="text" placeholder="Tamil Nadu" value={form.state} onChange={set('state')} className={`${INPUT} pl-3 ${errors.state ? 'border-red-400' : ''}`} /></div><FieldError message={errors.state} /></div>
          <div><label htmlFor="city" className={LABEL}>City <span className={MUTED}>Optional</span></label><div className="relative"><input id="city" type="text" placeholder="Chennai" value={form.city} onChange={set('city')} className={`${INPUT} pl-3 ${errors.city ? 'border-red-400' : ''}`} /></div><FieldError message={errors.city} /></div>
        </div>
        <PrimaryButton onClick={onNext} disabled={checkingEmail}>{checkingEmail ? 'Checking email...' : <>Continue <ArrowRight size={18} /></>}</PrimaryButton>
      </div>
    </div>
  );
}

function CategoryStep({ form, errors, setCategory, setRetailSubcategory, onNext, onBack }) {
  return (
    <div>
      <BackButton onClick={onBack} />
      <div className="mb-5"><h2 className={`text-[19px] font-bold m-0 mb-1 ${HEADING}`}>Select Business Type</h2><p className={`text-[13px] m-0 ${SUBTEXT}`}>Choose the category for your modules</p></div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2">
        {CATEGORIES.map(({ value, label, icon }) => {
          const Icon = CATEGORY_ICONS[icon];
          const locked = value !== 'retail';
          const selected = form.category === value;
          return (
            <button
              key={value}
              type="button"
              disabled={locked}
              onClick={() => !locked && setCategory(value)}
              className={`relative min-h-[88px] flex flex-col items-center justify-center gap-1.5 rounded-xl px-2 py-3 border transition-all ${locked ? 'cursor-not-allowed border-slate-200 bg-slate-50 opacity-75 dark:border-slate-700 dark:bg-slate-800/70' : selected ? 'cursor-pointer border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'cursor-pointer border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300'}`}
            >
              {locked && (
                <span className="absolute right-2 top-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-slate-500 ring-1 ring-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:ring-slate-600">
                  <Lock size={11} />
                </span>
              )}
              <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${locked ? 'bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-400' : selected ? 'bg-blue-500 text-white' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300'}`}>{Icon && <Icon size={16} />}</span>
              <span className={`text-[11.5px] font-semibold text-center leading-tight ${locked ? 'text-slate-500 dark:text-slate-400' : selected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300'}`}>{label}</span>
              {locked && <span className="text-[10px] font-bold leading-none text-slate-600 dark:text-slate-300">Coming soon</span>}
            </button>
          );
        })}
      </div>
      <FieldError message={errors.category} />
      {form.category === 'retail' && (
        <div className="mt-4">
          <label className={LABEL}>Retail Subcategory</label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {RETAIL_SUBCATEGORIES.map((item) => {
              const selected = form.retailSubcategory === item.value;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setRetailSubcategory(item.value)}
                  className={`min-h-[68px] rounded-xl border px-3 py-2 text-left cursor-pointer transition-all ${selected ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/10' : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-blue-300'}`}
                >
                  <span className={`block text-[12px] font-extrabold ${selected ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>{item.label}</span>
                  <span className={`block mt-1 text-[10.5px] leading-snug ${SUBTEXT}`}>{item.includes}</span>
                </button>
              );
            })}
          </div>
          <FieldError message={errors.retailSubcategory} />
        </div>
      )}
      <PrimaryButton onClick={onNext}>Continue <ArrowRight size={18} /></PrimaryButton>
    </div>
  );
}

function AccountStep({
  form, errors, error, message, submitting, checkingEmail, verifyingEmail, emailVerified, emailOtp, setEmailOtp,
  set, showPassword, setShowPassword, onSendEmailOtp, onVerifyEmailOtp, onNext,
}) {
  const [passwordFocused, setPasswordFocused] = useState(false);
  const passwordDisabled = !emailVerified;

  return (
    <div>
      <div className="mb-5"><h2 className={`text-[21px] font-bold m-0 mb-1 ${HEADING}`}>Create Your GoBook Account</h2><p className={`text-[13px] m-0 ${SUBTEXT}`}>Start managing your business from one connected workspace.</p></div>
      <div className="flex flex-col gap-3.5">
        <div><label htmlFor="name" className={LABEL}>Full Name <span className="text-red-500">*</span></label><div className="relative"><User size={15} className={ICON} /><input id="name" type="text" placeholder="Your name" value={form.name} onChange={set('name')} className={`${INPUT} ${errors.name ? 'border-red-400' : ''}`} /></div><FieldError message={errors.name} /></div>
        <div>
          <label htmlFor="phone" className={LABEL}>Mobile Number <span className="text-red-500">*</span></label>
          <div className="relative">
            <Phone size={15} className={ICON} />
            <input id="phone" type="tel" placeholder="98765 43210" value={form.phone} onChange={set('phone')} className={`${INPUT} ${errors.phone ? 'border-red-400' : ''}`} />
          </div>
          <FieldError message={errors.phone} />
        </div>
        <div>
          <label htmlFor="email" className={LABEL}>Email Address <span className="text-red-500">*</span></label>
          <div className="relative">
            <Mail size={15} className={ICON} />
            <input id="email" type="email" placeholder="you@company.com" value={form.email} onChange={set('email')} disabled={emailVerified || submitting || verifyingEmail} className={`${INPUT} pr-24 ${emailVerified ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-200' : ''} ${errors.email ? 'border-red-400' : ''}`} />
            <button type="button" onClick={onSendEmailOtp} disabled={submitting || checkingEmail || verifyingEmail || emailVerified} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-[11px] font-extrabold text-blue-700 disabled:opacity-60">{emailVerified ? 'Verified' : checkingEmail ? 'Sending...' : 'Send OTP'}</button>
          </div>
          <FieldError message={errors.email} />
        </div>
        {!emailVerified && (
          <div>
            <label htmlFor="emailOtp" className={LABEL}>Email OTP</label>
            <div className="relative">
              <Mail size={15} className={ICON} />
              <input id="emailOtp" type="text" inputMode="numeric" autoComplete="one-time-code" placeholder="Enter 6-digit OTP" value={emailOtp} onChange={(event) => setEmailOtp(event.target.value.replace(/\D/g, '').slice(0, 6))} className={`${INPUT} pr-24 ${errors.emailOtp ? 'border-red-400' : ''}`} maxLength={6} />
              <button type="button" onClick={onVerifyEmailOtp} disabled={verifyingEmail || emailOtp.length !== 6} className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-extrabold text-emerald-700 disabled:opacity-60">{verifyingEmail ? 'Verifying...' : 'Verify'}</button>
            </div>
            <FieldError message={errors.emailOtp} />
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div><label htmlFor="password" className={LABEL}>Create Password <span className="text-red-500">*</span></label><div className="relative"><PasswordRequirementPopover password={form.password} show={passwordFocused && !passwordDisabled} /><Lock size={15} className={ICON} /><input id="password" type={showPassword ? 'text' : 'password'} placeholder="Enter your password" value={form.password} disabled={passwordDisabled} onPaste={preventPasswordPaste} onFocus={() => setPasswordFocused(true)} onBlur={() => setPasswordFocused(false)} onChange={set('password')} className={`${INPUT} pr-11 ${passwordDisabled ? 'bg-slate-50 text-slate-400 dark:bg-slate-800/70 dark:text-slate-500' : ''} ${errors.password ? 'border-red-400' : ''}`} /><button type="button" onClick={() => setShowPassword((s) => !s)} disabled={passwordDisabled} aria-label={showPassword ? 'Hide password' : 'Show password'} className={`absolute right-3.5 top-1/2 -translate-y-1/2 cursor-pointer bg-transparent border-0 p-0 flex items-center disabled:opacity-40 ${EYE_BUTTON}`}>{showPassword ? <EyeOff size={14} /> : <Eye size={14} />}</button></div><FieldError message={errors.password} /></div>
          <div><label htmlFor="confirmPassword" className={LABEL}>Confirm Password <span className="text-red-500">*</span></label><div className="relative"><Lock size={15} className={ICON} /><input id="confirmPassword" type={showPassword ? 'text' : 'password'} value={form.confirmPassword} disabled={passwordDisabled} onPaste={preventPasswordPaste} onChange={set('confirmPassword')} className={`${INPUT} ${passwordDisabled ? 'bg-slate-50 text-slate-400 dark:bg-slate-800/70 dark:text-slate-500' : ''} ${errors.confirmPassword ? 'border-red-400' : ''}`} /></div><FieldError message={errors.confirmPassword} /></div>
        </div>
        {emailVerified && <div><label className={`flex items-center gap-2.5 text-[12.5px] leading-none cursor-pointer select-none ${CHECKBOX_TEXT}`}><input type="checkbox" checked={form.acceptTerms} onChange={set('acceptTerms')} className="w-4 h-4 rounded accent-blue-500 cursor-pointer flex-none" /><span>I agree to the <a href="/terms" className="font-semibold no-underline hover:underline" style={{ color: '#4f90ff' }}>Terms of Service</a> and <a href="/privacy" className="font-semibold no-underline hover:underline" style={{ color: '#4f90ff' }}>Privacy Policy</a></span></label><FieldError message={errors.acceptTerms} /></div>}
        {error && <div className={`rounded-xl px-4 py-2.5 ${ERROR_BOX}`}><span className={`text-[12.5px] ${ERROR_TEXT}`}>{error}</span></div>}
        {message && <div className="rounded-xl px-4 py-2.5 bg-emerald-50 text-emerald-700 text-[12.5px] border border-emerald-100">{message}</div>}
        <PrimaryButton onClick={onNext} disabled={submitting || checkingEmail || verifyingEmail || !emailVerified}>{submitting || checkingEmail || verifyingEmail ? 'Please wait...' : <>Continue <ArrowRight size={18} /></>}</PrimaryButton>
        <p className={`text-center text-[12px] mt-1 mb-0 ${MUTED}`}>Already have an account? <Link to="/login" className="font-bold no-underline hover:underline" style={{ color: '#4f90ff' }}>Sign In</Link></p>
      </div>
    </div>
  );
}

function PlanStep({ verifiedEmail, form, plans, plansLoading, errors, setPlan, error, submitting, onBack, onSubmit }) {
  const [expanded, setExpanded] = useState({});
  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3" noValidate>
      <BackButton onClick={onBack} />
      <div className="mb-1"><h2 className={`text-[19px] font-bold m-0 mb-1 ${HEADING}`}>Choose Package</h2><p className={`text-[13px] m-0 ${SUBTEXT}`}>Select a yearly package for your business category.</p></div>
      {plansLoading && <div className={'rounded-xl border p-5 text-center text-sm text-slate-500'}>Loading packages...</div>}
      {plans.map((plan) => {
        const showAll = Boolean(expanded[plan.tier]);
        const visibleFeatures = showAll ? plan.features : plan.features.slice(0, 4);
        return <article key={plan.tier} className={`rounded-2xl border p-4 ${form.subscriptionPlan === plan.tier ? 'border-indigo-500 ring-2 ring-indigo-200 shadow-md' : 'border-slate-200 dark:border-slate-700'}`}>
          <button type="button" onClick={() => setPlan(plan)} className="w-full border-0 bg-transparent p-0 text-left cursor-pointer">
            <span className="flex items-start justify-between gap-3">
              <b className={HEADING}>{plan.name}</b>
              <span className="text-right"><b className={`block text-[20px] ${HEADING}`}>₹{Number(plan.amount).toLocaleString('en-IN')}</b><small className={MUTED}>per year</small></span>
            </span>
            <span className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {visibleFeatures.map((feature) => <span key={feature} className={`flex gap-1.5 text-[11px] ${SUBTEXT}`}><Check size={13} className="shrink-0 text-emerald-600" />{feature}</span>)}
            </span>
          </button>
          {plan.features.length > 4 && <button type="button" onClick={() => setExpanded((state) => ({ ...state, [plan.tier]: !showAll }))} className="mt-3 inline-flex items-center gap-1 border-0 bg-transparent p-0 text-[11px] font-bold text-indigo-600 cursor-pointer">{showAll ? 'Show less' : `View all ${plan.features.length} features`}{showAll ? <ChevronUp size={13} /> : <ChevronDown size={13} />}</button>}
        </article>;
      })}
      <FieldError message={errors.subscriptionPlan} />
      {error && <div className={`rounded-xl px-4 py-2.5 ${ERROR_BOX}`}><span className={`text-[12.5px] ${ERROR_TEXT}`}>{error}</span></div>}
      <PrimaryButton type="submit" disabled={submitting}><Mail size={18} />{submitting ? 'Please wait...' : 'Continue'}</PrimaryButton>
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
      <PrimaryButton type="submit" disabled={submitting || otp.length !== 6}><CreditCard size={17} />{submitting ? 'Creating account...' : 'Verify & Create Account'}</PrimaryButton>
      <button type="button" onClick={onResend} disabled={resending} className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold text-[12px] cursor-pointer disabled:opacity-60"><RefreshCw size={14} />{resending ? 'Sending...' : 'Resend OTP'}</button>
    </form>
  );
}

export function RegisterPage() {
  const location = useLocation();
  const emailVerification = location.state || {};
  const skipPlanStep = Boolean(emailVerification.startTrial);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    businessName: '', gstin: '', state: '', city: '', phone: '', email: emailVerification?.email || '', category: '', retailSubcategory: '',
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
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [verifyingEmail, setVerifyingEmail] = useState(false);
  const [emailOtp, setEmailOtp] = useState('');
  const [verifiedSignup, setVerifiedSignup] = useState({
    email: emailVerification.signupToken ? String(emailVerification.email || '').trim().toLowerCase() : '',
    signupToken: emailVerification.signupToken || '',
  });

  const verifiedEmail = Boolean(verifiedSignup.signupToken && verifiedSignup.email === form.email.trim().toLowerCase());

  const signupPayload = useMemo(() => ({
    signupToken: verifiedEmail ? verifiedSignup.signupToken : undefined,
    name: form.name,
    email: form.email,
    password: form.password,
    businessName: form.businessName,
    category: form.category,
    retailSubcategory: form.category === 'retail' ? form.retailSubcategory : '',
    phone: form.phone,
    gstin: form.gstin.trim().toUpperCase(),
    state: form.state.trim(),
    city: form.city.trim(),






    subscriptionPlan: skipPlanStep ? '' : form.subscriptionPlan,
  }), [form, verifiedEmail, verifiedSignup.signupToken, skipPlanStep]);

  useEffect(() => {
    if (!form.category) return;
    let active = true;
    setPlansLoading(true);
    fetchSubscriptionPlans(form.category)
      .then((data) => {
        if (!active) return;
        setPlans(data.plans || []);
      })
      .catch((err) => {
        if (active) setError(err.message || 'Unable to load packages');
      })
      .finally(() => {
        if (active) setPlansLoading(false);
      });
    return () => { active = false; };
  }, [form.category, skipPlanStep]);

  function set(field) {
    return (e) => {
      const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
      if (field === 'email') {
        const normalizedEmail = String(value || '').trim().toLowerCase();
        setVerifiedSignup((current) => (current.email === normalizedEmail ? current : { email: '', signupToken: '' }));
        setEmailOtp('');
        setMessage('');
      }
      setForm((f) => field === 'category'
        ? { ...f, category: value, retailSubcategory: value === 'retail' ? f.retailSubcategory : '', subscriptionPlan: '', subscriptionAmount: 0 }
        : { ...f, [field]: value });
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const next = { ...prev };
        delete next[field];
        return next;
      });
    };
  }

  async function handleCompanyNext() {
    const validationErrors = validateCompanyStep(form);
    setErrors(validationErrors);
    setError('');
    if (Object.keys(validationErrors).length > 0) return;
    setStep(2);
  }

  function goNext(validate) {
    const validationErrors = validate(form);
    setErrors(validationErrors);
    setError('');
    if (Object.keys(validationErrors).length > 0) return;
    setStep((s) => s + 1);
  }

  async function handleAccountNext() {
    const validationErrors = validateAccountStep(form);
    if (!verifiedEmail) validationErrors.email = 'Verify your email before creating a password';
    setErrors(validationErrors);
    setError('');
    if (Object.keys(validationErrors).length > 0) return;

    setCheckingEmail(true);
    try {
      const result = await checkRegistrationEmailAvailability(form.email);
      if (!result.available) {
        setErrors((current) => ({ ...current, email: result.message || 'Email already registered. Use another email address.' }));
        return;
      }
      setStep(1);
    } catch (err) {
      setErrors((current) => ({ ...current, email: err.message || 'Unable to validate email. Please try again.' }));
    } finally {
      setCheckingEmail(false);
    }
  }

  async function handleSendEmailOtp() {
    const validationErrors = validateAccountIdentityStep(form);
    setErrors(validationErrors);
    setError('');
    setMessage('');
    if (Object.keys(validationErrors).length > 0) return;

    setCheckingEmail(true);
    try {
      const result = await checkRegistrationEmailAvailability(form.email);
      if (!result.available) {
        setErrors((current) => ({ ...current, email: result.message || 'Email already registered. Use another email address.' }));
        return;
      }
      await startEmailOtpLogin(form.email);
      setEmailOtp('');
      setMessage('OTP sent to your email. Verify it to unlock password setup.');
    } catch (err) {
      setErrors((current) => ({ ...current, email: err.message || 'Unable to send OTP. Please try again.' }));
    } finally {
      setCheckingEmail(false);
    }
  }

  async function handleVerifyEmailOtp() {
    setError('');
    setMessage('');
    setErrors((current) => {
      if (!current.emailOtp) return current;
      const next = { ...current };
      delete next.emailOtp;
      return next;
    });
    if (!/^\d{6}$/.test(emailOtp)) {
      setErrors((current) => ({ ...current, emailOtp: 'Enter the 6-digit OTP sent to your email' }));
      return;
    }

    setVerifyingEmail(true);
    try {
      const data = await verifyEmailOtpLogin({ email: form.email, otp: emailOtp });
      if (data.token && data.user) {
        redirectTo('/dashboard');
        return;
      }
      if (!data.signupToken) throw new Error('Email could not be verified for signup');
      setVerifiedSignup({ email: data.email || form.email.trim().toLowerCase(), signupToken: data.signupToken });
      setEmailOtp('');
      setMessage('Email verified. You can now create your password.');
    } catch (err) {
      setErrors((current) => ({ ...current, emailOtp: err.message || 'Invalid or expired OTP' }));
    } finally {
      setVerifyingEmail(false);
    }
  }

  function handleCategoryNext() {
    const validationErrors = validateCategoryStep(form);
    setErrors(validationErrors);
    setError('');
    if (Object.keys(validationErrors).length > 0) return;
    if (skipPlanStep) {
      handleSendOtp(null, { skipPlanValidation: true });
      return;
    }
    setStep(3);
  }

  function goBack() {
    setErrors({});
    setError('');
    setMessage('');
    setStep((s) => {
      if (s <= 0) {
        redirectTo('/login');
        return 0;
      }
      return s - 1;
    });
  }

  function choosePlan(plan) {
    setForm((current) => ({ ...current, subscriptionPlan: plan.tier, subscriptionAmount: plan.amount }));
    setErrors((current) => {
      if (!current.subscriptionPlan) return current;
      const next = { ...current };
      delete next.subscriptionPlan;
      return next;
    });
  }

  async function finishRegistrationResponse(data) {
    if (data.token && data.user) {
      redirectTo('/dashboard');
      return true;
    }
    if (data.checkout) {
      const payment = await openRazorpayCheckout(data.checkout);
      await verifyRegistrationPayment(payment);
      redirectTo('/dashboard');
      return true;
    }
    return false;
  }

  async function handleSendOtp(event, { skipPlanValidation = false } = {}) {
    event?.preventDefault?.();
    const validationErrors = skipPlanValidation || form.subscriptionPlan ? {} : { subscriptionPlan: 'Select a plan to continue' };
    setErrors(validationErrors);
    setError('');
    setMessage('');
    if (Object.keys(validationErrors).length > 0) return;

    setSubmitting(true);
    try {
      const data = await sendRegisterOtp(skipPlanValidation ? { ...signupPayload, subscriptionPlan: '' } : signupPayload);
      if (await finishRegistrationResponse(data)) return;
      setOtp('');
      setMessage(data.message || 'OTP sent to your email');
      setStep(4);
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
      const verification = await verifyRegisterOtp({ email: form.email, otp });
      if (await finishRegistrationResponse(verification)) return;
      throw new Error('Account could not be created');
    } catch (err) {
      setError(err.message || 'Unable to verify OTP or payment');
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
      <div className="auth-register-wizard">
        <div className="auth-register-logo flex justify-center mb-4"><div className="inline-flex bg-white rounded-2xl px-4 py-2.5"><img src="/gobook-logo-full.png" alt="GoBook" className="h-9 sm:h-10 w-auto object-contain" /></div></div>
        <StepProgress step={step} />
        {step === 0 && <AccountStep form={form} errors={errors} error={error} message={message} submitting={submitting} checkingEmail={checkingEmail} verifyingEmail={verifyingEmail} emailVerified={verifiedEmail} emailOtp={emailOtp} setEmailOtp={setEmailOtp} set={set} showPassword={showPassword} setShowPassword={setShowPassword} onSendEmailOtp={handleSendEmailOtp} onVerifyEmailOtp={handleVerifyEmailOtp} onNext={handleAccountNext} />}
        {step === 1 && <CompanyDetailsStep form={form} errors={errors} set={set} onNext={handleCompanyNext} onBack={goBack} checkingEmail={checkingEmail} />}
        {step === 2 && <CategoryStep form={form} errors={errors} setCategory={(value) => set('category')({ target: { type: 'text', value } })} setRetailSubcategory={(value) => set('retailSubcategory')({ target: { type: 'text', value } })} onNext={handleCategoryNext} onBack={goBack} />}

        {step === 3 && <PlanStep verifiedEmail={verifiedEmail} form={form} plans={plans} plansLoading={plansLoading} errors={errors} setPlan={choosePlan} error={error} submitting={submitting} onBack={goBack} onSubmit={handleSendOtp} />}
        {step === 4 && <OtpStep email={form.email} otp={otp} setOtp={setOtp} error={error} message={message} submitting={submitting} resending={resending} onBack={goBack} onSubmit={handleVerifyOtp} onResend={handleResendOtp} />}
      </div>
    </AuthLayout>
  );
}

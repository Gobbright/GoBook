import { redirectTo } from '../../routes/navigation.js';
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, Eye, EyeOff, Lock, Mail, Phone, ShieldCheck } from 'lucide-react';

import { CATEGORIES } from '../../constants/categories.js';
import { completeGoogleOnboarding, getCurrentUser, logout } from '../../services/authService.js';
import { fetchSubscriptionPlans, openRazorpayCheckout, verifyRegistrationPayment } from '../../services/subscriptionService.js';
import { AuthLayout } from './AuthLayout.jsx';
import { ERROR_BOX, ERROR_TEXT, EYE_BUTTON, HEADING, ICON, INPUT, LABEL, MUTED, SUBTEXT } from './authTheme.jsx';

const FALLBACK_PLANS = [
  { value: 'starter', label: 'Starter', amount: 499, price: '₹ 499', note: 'Basic billing and records' },
  { value: 'professional', label: 'Professional', amount: 999, price: '₹ 999', note: 'Full business modules' },
  { value: 'enterprise', label: 'Enterprise', amount: 1999, price: '₹ 1,999', note: 'Advanced controls' },
];

const CATEGORY_MEDIA = {
  retail: { image: '/category-images/retail.svg', tint: 'from-emerald-500 to-teal-600' },
  school: { image: '/category-images/school.svg', tint: 'from-sky-500 to-blue-600' },
  hospital: { image: '/category-images/hospital.svg', tint: 'from-rose-500 to-red-600' },
  hotel: { image: '/category-images/hotel.svg', tint: 'from-amber-500 to-orange-600' },
  manufacturing: { image: '/category-images/manufacturing.svg', tint: 'from-slate-500 to-zinc-700' },
  construction: { image: '/category-images/construction.svg', tint: 'from-yellow-500 to-stone-700' },
  ngo: { image: '/category-images/ngo.svg', tint: 'from-violet-500 to-fuchsia-600' },
  automobile: { image: '/category-images/automobile.svg', tint: 'from-cyan-500 to-indigo-600' },
  finance: { image: '/category-images/finance.svg', tint: 'from-emerald-500 to-teal-700' },
};

function FieldError({ message }) {
  if (!message) return null;
  return <span className={`block mt-1 text-[11px] ${ERROR_TEXT}`}>{message}</span>;
}

function validateDetails(form) {
  const errors = {};
  if (!form.businessName.trim()) errors.businessName = 'Business name is required';
  if (!form.phone.trim()) errors.phone = 'Phone number is required';
  if (!form.category) errors.category = 'Select business type';
  if (!form.password) errors.password = 'Password is required';
  else if (form.password.length < 8) errors.password = 'Password must be at least 8 characters';
  if (!form.confirmPassword) errors.confirmPassword = 'Confirm password is required';
  else if (form.password !== form.confirmPassword) errors.confirmPassword = 'Passwords do not match';
  return errors;
}

function validatePlan(form) {
  const errors = {};
  if (!form.subscriptionPlan) errors.subscriptionPlan = 'Choose a plan';
  return errors;
}

export function GoogleOnboardingPage() {
  const user = getCurrentUser();
  const [step, setStep] = useState('details');
  const [form, setForm] = useState({
    businessName: user?.businessName || '',
    phone: user?.phone || '',
    gstin: '',
    category: user?.category || '',
    subscriptionPlan: user?.subscriptionPlan || '',
    subscriptionAmount: user?.subscriptionAmount || 0,
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [plans, setPlans] = useState([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [pendingCheckout, setPendingCheckout] = useState(null);

  useEffect(() => {
    if (user && !user.needsOnboarding) redirectTo('/dashboard');
  }, [user]);

  useEffect(() => {
    if (!form.category) return;
    setPlansLoading(true);
    fetchSubscriptionPlans(form.category)
      .then((data) => setPlans(data.plans || []))
      .catch((err) => {
        if (FALLBACK_PLANS.length) setError(err.message || 'Unable to load packages');
      })
      .finally(() => setPlansLoading(false));
  }, [form.category]);

  function updateField(field, value) {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  }

  function set(field) {
    return (event) => updateField(field, event.target.value);
  }

  function chooseCategory(value) {
    updateField('category', value);
  }

  function choosePlan(plan) {
    if (pendingCheckout) return;
    setForm((current) => ({ ...current, subscriptionPlan: plan.tier, subscriptionAmount: plan.amount }));
    setErrors((current) => {
      if (!current.subscriptionPlan) return current;
      const next = { ...current };
      delete next.subscriptionPlan;
      return next;
    });
  }

  function goToPlan() {
    const nextErrors = validateDetails(form);
    setErrors(nextErrors);
    setError('');
    if (Object.keys(nextErrors).length > 0) return;
    setStep('plan');
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const selectedPlan = plans.find((plan) => plan.tier === form.subscriptionPlan);
    const nextErrors = validatePlan(form);
    setErrors(nextErrors);
    setError('');
    if (Object.keys(nextErrors).length > 0) return;

    setSubmitting(true);
    try {
      let checkout = pendingCheckout;
      if (!checkout) {
        const verification = await completeGoogleOnboarding({
          ...form,
          subscriptionAmount: selectedPlan?.amount || form.subscriptionAmount,
          gstin: form.gstin.trim().toUpperCase(),
        });
        if (verification.token && verification.user) {
          redirectTo('/dashboard');
          return;
        }
        if (!verification.paymentRequired || !verification.checkout) throw new Error('Payment order was not created');
        checkout = verification.checkout;
        setPendingCheckout(checkout);
      }
      const payment = await openRazorpayCheckout(checkout);
      await verifyRegistrationPayment(payment);
      redirectTo('/dashboard');
    } catch (err) {
      setError(err.message || 'Unable to complete secure payment');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout compact cardMaxWidth={500}>
      <div className="flex justify-center mb-2 sm:mb-3">
        <div className="inline-flex bg-white rounded-xl px-3.5 py-2">
          <img src="/gobook-logo-full.png" alt="GoBook" className="h-7 sm:h-8 w-auto object-contain" />
        </div>
      </div>

      <div className="text-center mb-3">
        <h2 className={`text-[18px] sm:text-[20px] font-bold m-0 mb-1 ${HEADING}`}>{step === 'details' ? 'Complete setup' : 'Choose plan'}</h2>
        <p className={`text-[12px] m-0 ${SUBTEXT}`}>{step === 'details' ? 'Select category and create password' : 'Pick amount and finish setup'}</p>
      </div>

      {step === 'details' && (
        <div className="flex flex-col gap-2.5">
          <div>
            <label htmlFor="googleEmail" className={LABEL}>Email</label>
            <div className="relative">
              <Mail size={15} className={ICON} />
              <input id="googleEmail" value={user?.email || ''} readOnly className={`${INPUT} bg-slate-50 text-slate-500`} />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="businessName" className={LABEL}>Business Name</label>
              <div className="relative">
                <Building2 size={15} className={ICON} />
                <input id="businessName" value={form.businessName} onChange={set('businessName')} className={`${INPUT} ${errors.businessName ? 'border-red-400' : ''}`} placeholder="Company name" />
              </div>
              <FieldError message={errors.businessName} />
            </div>
            <div>
              <label htmlFor="phone" className={LABEL}>Phone</label>
              <div className="relative">
                <Phone size={15} className={ICON} />
                <input id="phone" value={form.phone} onChange={set('phone')} className={`${INPUT} ${errors.phone ? 'border-red-400' : ''}`} placeholder="98765 43210" />
              </div>
              <FieldError message={errors.phone} />
            </div>
          </div>

          <div>
            <label className={LABEL}>Business Type</label>
            <div className="grid grid-cols-4 gap-1.5">
              {CATEGORIES.map((category) => {
                const media = CATEGORY_MEDIA[category.value] || CATEGORY_MEDIA.retail;
                const active = form.category === category.value;
                return (
                  <button
                    key={category.value}
                    type="button"
                    onClick={() => chooseCategory(category.value)}
                    className={`h-[58px] overflow-hidden rounded-lg border p-0 text-left cursor-pointer relative ${active ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200'}`}
                    aria-pressed={active}
                  >
                    <img src={media.image} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
                    <span className={`absolute inset-0 bg-gradient-to-br ${media.tint} opacity-70`} />
                    <span className="absolute inset-x-1.5 bottom-1.5 text-[10px] font-extrabold leading-tight text-white drop-shadow-sm">{category.label}</span>
                  </button>
                );
              })}
            </div>
            <FieldError message={errors.category} />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label htmlFor="gstin" className={LABEL}>GSTIN <span className={MUTED}>(Optional)</span></label>
              <div className="relative">
                <ShieldCheck size={15} className={ICON} />
                <input id="gstin" value={form.gstin} onChange={set('gstin')} className={`${INPUT} uppercase`} maxLength={15} placeholder="GSTIN" />
              </div>
            </div>
            <div>
              <label htmlFor="googlePassword" className={LABEL}>Password</label>
              <div className="relative">
                <Lock size={15} className={ICON} />
                <input id="googlePassword" type={showPassword ? 'text' : 'password'} value={form.password} onChange={set('password')} className={`${INPUT} pr-10 ${errors.password ? 'border-red-400' : ''}`} placeholder="Min 8 chars" />
                <button type="button" onClick={() => setShowPassword((s) => !s)} className={`absolute right-3 top-1/2 -translate-y-1/2 cursor-pointer bg-transparent border-0 p-0 flex items-center ${EYE_BUTTON}`} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
              <FieldError message={errors.password} />
            </div>
          </div>

          <div>
            <label htmlFor="confirmGooglePassword" className={LABEL}>Confirm Password</label>
            <div className="relative">
              <Lock size={15} className={ICON} />
              <input id="confirmGooglePassword" type={showPassword ? 'text' : 'password'} value={form.confirmPassword} onChange={set('confirmPassword')} className={`${INPUT} ${errors.confirmPassword ? 'border-red-400' : ''}`} placeholder="Re-enter password" />
            </div>
            <FieldError message={errors.confirmPassword} />
          </div>

          <button type="button" onClick={goToPlan} className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-white font-bold text-[13px] border-0 cursor-pointer" style={{ background: 'linear-gradient(135deg, #4f90ff 0%, #6366f1 100%)' }}>
            Next <ArrowRight size={16} />
          </button>

          <button type="button" onClick={logout} className="bg-transparent border-0 cursor-pointer text-[11px] font-bold text-slate-500">Use another account</button>
        </div>
      )}

      {step === 'plan' && (
        <form onSubmit={handleSubmit} className="flex flex-col gap-3" noValidate>
          <div className="rounded-xl bg-slate-50 border border-slate-100 px-3 py-2 text-[12px] text-slate-600">
            <strong className="text-slate-800">{form.businessName}</strong><br />
            {user?.email}
          </div>

          <div>
            <label className={LABEL}>Choose Plan</label>
            <div className="grid grid-cols-1 gap-2">
              {plansLoading && <div className={'p-4 text-center text-xs text-slate-500'}>Loading packages...</div>}
              {plans.map((plan) => (
                <button
                  key={plan.tier}
                  type="button"
                  onClick={() => choosePlan(plan)}
                  className={`min-h-[70px] rounded-xl border px-3 text-left cursor-pointer flex items-center justify-between gap-3 ${form.subscriptionPlan === plan.tier ? 'border-emerald-500 bg-emerald-50' : 'border-slate-200 bg-white'}`}
                >
                  <span>
                    <span className="block text-[13px] font-extrabold text-slate-800 leading-tight">{plan.name}</span>
                    <span className="block text-[11px] text-slate-500 mt-0.5 leading-tight">{plan.features.slice(0, 4).join(' · ')}</span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block text-[17px] font-black text-slate-900 leading-none">₹{Number(plan.amount).toLocaleString('en-IN')}</span>
                    <span className="block text-[10px] font-bold text-slate-400 mt-1">/ year</span>
                  </span>
                </button>
              ))}
            </div>
            <FieldError message={errors.subscriptionPlan} />
          </div>

          {error && <div className={`rounded-xl px-3 py-2 ${ERROR_BOX}`}><span className={`text-[12px] ${ERROR_TEXT}`}>{error}</span></div>}

          <button type="submit" disabled={submitting} className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-white font-bold text-[14px] border-0 cursor-pointer disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #4f90ff 0%, #6366f1 100%)' }}>
            <CheckCircle2 size={17} />
            {submitting ? 'Opening secure payment...' : pendingCheckout ? 'Retry Secure Payment' : 'Pay & Create Account'}
          </button>

          <button type="button" onClick={() => setStep('details')} disabled={Boolean(pendingCheckout)} className="bg-transparent border-0 cursor-pointer text-[11.5px] font-bold text-slate-500 inline-flex items-center justify-center gap-1 disabled:opacity-40">
            <ArrowLeft size={13} /> Back
          </button>
        </form>
      )}
    </AuthLayout>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { Check, CreditCard, LogOut, ShieldCheck } from 'lucide-react';

import { redirectTo } from '../../routes/navigation.js';
import { getCurrentUser, logout } from '../../services/authService.js';
import { apiClient } from '../../services/apiClient.js';
import {
  createSubscriptionPaymentOrder,
  fetchSubscriptionPlans,
  openRazorpayCheckout,
  verifySubscriptionPayment,
} from '../../services/subscriptionService.js';
import { AuthLayout } from './AuthLayout.jsx';
import { ERROR_BOX, ERROR_TEXT, HEADING, MUTED, SUBTEXT } from './authTheme.jsx';

function isTrialExpired(user) {
  return Boolean(user?.trialExpired || (user?.subscriptionStatus === 'trial' && user?.trialEndsAt && new Date(user.trialEndsAt).getTime() <= Date.now()));
}

export function PaymentPage() {
  const user = useMemo(() => getCurrentUser(), []);
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(user?.subscriptionPlan || '');
  const [loading, setLoading] = useState(true);
  const [bankDetails, setBankDetails] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const plan = useMemo(() => plans.find((item) => item.tier === selectedPlan), [plans, selectedPlan]);

  useEffect(() => {
    if (!user) {
      redirectTo('/login');
      return;
    }
    if (!isTrialExpired(user) && user.subscriptionStatus === 'active') {
      redirectTo('/dashboard');
      return;
    }
    Promise.all([
      fetchSubscriptionPlans(user.category),
      apiClient('/settings').catch(() => null),
    ])
      .then(([data, settings]) => {
        const nextPlans = data.plans || [];
        setPlans(nextPlans);
        setSelectedPlan((current) => current || nextPlans[0]?.tier || '');
        setBankDetails(settings);
      })
      .catch((err) => setError(err.message || 'Unable to load packages'))
      .finally(() => setLoading(false));
  }, [user]);

  async function handlePay() {
    if (!selectedPlan) {
      setError('Choose a plan to continue');
      return;
    }
    setError('');
    setSubmitting(true);
    try {
      const { checkout } = await createSubscriptionPaymentOrder(selectedPlan);
      const payment = await openRazorpayCheckout(checkout);
      await verifySubscriptionPayment(payment);
      redirectTo('/dashboard');
    } catch (err) {
      setError(err.message || 'Unable to complete payment');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthLayout cardMaxWidth={520}>
      <div className="mb-5 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
          <CreditCard size={26} />
        </div>
        <h2 className={`m-0 mb-2 text-[22px] font-bold ${HEADING}`}>Activate your subscription</h2>
        <p className={`m-0 text-[13px] leading-relaxed ${SUBTEXT}`}>
          Your 15-day free trial is complete. Choose a yearly package to continue using GoBook.
        </p>
      </div>

      <div className="mb-4 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-[12.5px] text-slate-600">
        <strong className="block text-slate-900">{user?.businessName || user?.name}</strong>
        <span>{user?.email}</span>
      </div>

      {bankDetails?.accountNumber && (
        <div className="mb-4 rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-[12px] text-slate-700">
          <strong className="mb-2 block text-[13px] text-slate-900">Saved account details for plan purchase</strong>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
            <span><b>Holder:</b> {bankDetails.accountHolderName || '-'}</span>
            <span><b>Bank:</b> {bankDetails.bankName || '-'}</span>
            <span><b>Account:</b> {bankDetails.accountNumber}</span>
            <span><b>IFSC:</b> {bankDetails.ifscCode || '-'}</span>
          </div>
        </div>
      )}

      <div className="grid gap-2">
        {loading && <div className="rounded-xl border border-slate-200 p-5 text-center text-sm text-slate-500">Loading packages...</div>}
        {plans.map((item) => (
          <button
            key={item.tier}
            type="button"
            onClick={() => setSelectedPlan(item.tier)}
            className={`min-h-[82px] cursor-pointer rounded-xl border bg-white px-4 py-3 text-left transition ${selectedPlan === item.tier ? 'border-blue-500 ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-300'}`}
          >
            <span className="flex items-start justify-between gap-3">
              <span>
                <strong className="block text-[14px] text-slate-900">{item.name}</strong>
                <span className={`mt-1 block text-[11.5px] leading-snug ${MUTED}`}>{(item.features || []).slice(0, 3).join(' / ')}</span>
              </span>
              <span className="text-right">
                <strong className="block text-[20px] leading-none text-slate-900">Rs {Number(item.amount).toLocaleString('en-IN')}</strong>
                <span className={`text-[10.5px] font-bold ${MUTED}`}>per year</span>
              </span>
            </span>
          </button>
        ))}
      </div>

      {error && <div className={`mt-4 rounded-xl px-4 py-2.5 ${ERROR_BOX}`}><span className={`text-[12.5px] ${ERROR_TEXT}`}>{error}</span></div>}

      <button
        type="button"
        onClick={handlePay}
        disabled={submitting || loading || !plan}
        className="mt-5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 px-4 py-3.5 text-[15px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #4f90ff 0%, #6366f1 100%)', boxShadow: '0 6px 24px -4px rgba(79,144,255,0.45)' }}
      >
        <ShieldCheck size={18} />
        {submitting ? 'Opening payment...' : `Pay ${plan ? `Rs ${Number(plan.amount).toLocaleString('en-IN')}` : 'now'}`}
      </button>

      <div className="mt-4 flex items-center justify-between gap-3 text-[12px]">
        <span className={`inline-flex items-center gap-1.5 ${MUTED}`}><Check size={13} />Secure Razorpay checkout</span>
        <button type="button" onClick={logout} className="inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-[12px] font-bold text-slate-500">
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </AuthLayout>
  );
}

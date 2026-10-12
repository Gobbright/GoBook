import { useEffect, useMemo, useState } from 'react';
import { Check, CreditCard, LogOut, ShieldCheck, Sparkles } from 'lucide-react';

import { redirectTo } from '../../routes/navigation.js';
import { getCurrentUser, logout } from '../../services/authService.js';
import { apiClient } from '../../services/apiClient.js';
import {
  createSubscriptionPaymentOrder,
  downloadSubscriptionReceipt,
  fetchSubscriptionPlans,
  openRazorpayCheckout,
  verifySubscriptionPayment,
} from '../../services/subscriptionService.js';
import { AuthLayout } from './AuthLayout.jsx';
import { ERROR_BOX, ERROR_TEXT, HEADING, MUTED, SUBTEXT } from './authTheme.jsx';

function isTrialExpired(user) {
  return Boolean(user?.trialExpired || (user?.subscriptionStatus === 'trial' && user?.trialEndsAt && new Date(user.trialEndsAt).getTime() <= Date.now()));
}

function isSubscriptionExpired(user) {
  return Boolean(user?.billingStatus === 'SUBSCRIPTION_EXPIRED' || (user?.subscriptionStatus === 'active' && user?.subscriptionExpiresAt && new Date(user.subscriptionExpiresAt).getTime() <= Date.now()));
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
  const selectedIndex = useMemo(() => Math.max(0, plans.findIndex((item) => item.tier === selectedPlan)), [plans, selectedPlan]);
  const subscriptionExpired = isSubscriptionExpired(user);
  const expiryLabel = subscriptionExpired ? 'Subscription expired' : 'Trial ended';

  useEffect(() => {
    if (!user) {
      redirectTo('/login');
      return;
    }
    if (!isTrialExpired(user) && !isSubscriptionExpired(user) && ['active', 'trial'].includes(user.subscriptionStatus)) {
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
      const result = await verifySubscriptionPayment(payment);
      if (result.receipt?.id) await downloadSubscriptionReceipt(result.receipt.id).catch(() => {});
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
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-blue-100 bg-blue-50 text-blue-600 shadow-sm">
          <CreditCard size={28} />
        </div>
        <h2 className={`m-0 mb-2 text-[24px] font-black tracking-tight ${HEADING}`}>Activate your subscription</h2>
        <p className={`mx-auto m-0 max-w-[360px] text-[13.5px] leading-6 ${SUBTEXT}`}>
          {subscriptionExpired ? 'Your subscription has expired.' : 'Your trial has ended.'} Pick a yearly plan to unlock billing, inventory, reports, and daily operations.
        </p>
      </div>

      <div className="mb-4 flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-[12.5px] text-slate-600">
        <span className="min-w-0">
          <strong className="block truncate text-[13.5px] text-slate-900">{user?.businessName || user?.name}</strong>
          <span className="block truncate">{user?.email}</span>
        </span>
        <span className="flex-none rounded-full bg-amber-50 px-2.5 py-1 text-[10.5px] font-black uppercase tracking-wide text-amber-700">{expiryLabel}</span>
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

      <div className="grid gap-2.5">
        {loading && <div className="rounded-xl border border-slate-200 p-5 text-center text-sm text-slate-500">Loading packages...</div>}
        {plans.map((item, index) => (
          <button
            key={item.tier}
            type="button"
            onClick={() => setSelectedPlan(item.tier)}
            className={`relative min-h-[94px] cursor-pointer overflow-hidden rounded-xl border bg-white px-4 py-3.5 text-left transition ${selectedPlan === item.tier ? 'border-blue-500 shadow-[0_10px_28px_rgba(37,99,235,0.12)] ring-2 ring-blue-100' : 'border-slate-200 hover:border-blue-300 hover:bg-slate-50'}`}
          >
            <span className="flex items-start justify-between gap-4">
              <span className="min-w-0">
                <span className="flex items-center gap-2">
                  <strong className="block text-[15px] font-black text-slate-900">{item.name}</strong>
                  {index === 1 && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-emerald-700">
                      <Sparkles size={10} /> Popular
                    </span>
                  )}
                </span>
                <span className={`mt-2 block text-[12px] leading-5 ${MUTED}`}>{(item.features || []).slice(0, 3).join(' / ')}</span>
              </span>
              <span className="flex-none text-right">
                <span className="block text-[11px] font-black uppercase leading-none text-slate-400">Rs</span>
                <strong className="block text-[23px] font-black leading-none text-slate-900">{Number(item.amount).toLocaleString('en-IN')}</strong>
                <span className={`mt-1 block text-[10.5px] font-bold ${MUTED}`}>per year</span>
              </span>
            </span>
            {selectedPlan === item.tier && <span className="absolute bottom-0 left-0 h-1 w-full bg-blue-600" />}
          </button>
        ))}
      </div>

      {error && <div className={`mt-4 rounded-xl px-4 py-2.5 ${ERROR_BOX}`}><span className={`text-[12.5px] ${ERROR_TEXT}`}>{error}</span></div>}

      <button
        type="button"
        onClick={handlePay}
        disabled={submitting || loading || !plan}
        className="mt-5 flex min-h-[54px] w-full cursor-pointer items-center justify-center gap-2 rounded-xl border-0 px-4 py-3.5 text-[15px] font-black text-white disabled:cursor-not-allowed disabled:opacity-60"
        style={{ background: 'linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)', boxShadow: '0 10px 26px -8px rgba(37,99,235,0.55)' }}
      >
        <ShieldCheck size={18} />
        {submitting ? 'Opening secure checkout...' : `Pay ${plan ? `Rs ${Number(plan.amount).toLocaleString('en-IN')}` : 'now'}`}
      </button>

      <div className="mt-4 flex items-center justify-between gap-3 text-[12px]">
        <span className={`inline-flex items-center gap-1.5 ${MUTED}`}><Check size={13} />Secure Razorpay checkout</span>
        {plans.length > 0 && <span className={MUTED}>{selectedIndex + 1} of {plans.length}</span>}
        <button type="button" onClick={logout} className="inline-flex cursor-pointer items-center gap-1.5 border-0 bg-transparent p-0 text-[12px] font-bold text-slate-500">
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </AuthLayout>
  );
}

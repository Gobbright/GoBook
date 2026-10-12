import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, CreditCard, ShieldCheck } from 'lucide-react';
import { redirectTo } from '../../routes/navigation.js';
import { getCurrentUser } from '../../services/authService.js';
import { createPaymentMethodVerificationOrder, openRazorpayCheckout, verifyPaymentMethod } from '../../services/subscriptionService.js';
import { AuthLayout } from './AuthLayout.jsx';
import { ERROR_BOX, ERROR_TEXT, HEADING, SUBTEXT } from './authTheme.jsx';

export function PaymentMethodVerificationPage() {
  const user = useMemo(() => getCurrentUser(), []);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) redirectTo('/login');
    else if (user.isPlatformOwner) redirectTo('/admin');
    else if (user.paymentMethodVerified && user.subscriptionStatus === 'trial') redirectTo('/dashboard');
    else if (user.billingStatus !== 'PAYMENT_METHOD_VERIFICATION_PENDING') redirectTo('/payment');
  }, [user]);

  async function verify() {
    setError('');
    setSubmitting(true);
    try {
      const { checkout } = await createPaymentMethodVerificationOrder();
      const payment = await openRazorpayCheckout(checkout);
      await verifyPaymentMethod(payment);
      redirectTo('/dashboard');
    } catch (err) {
      setError(err.message || 'Unable to verify your payment method. Please try again.');
    } finally { setSubmitting(false); }
  }

  return (
    <AuthLayout compact cardMaxWidth={500}>
      <div className="text-center mb-6">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600"><ShieldCheck size={28} /></div>
        <h1 className={`m-0 mb-2 text-[22px] font-bold ${HEADING}`}>Verify your payment method</h1>
        <p className={`m-0 text-[13px] leading-relaxed ${SUBTEXT}`}>Complete one secure Razorpay verification before your 15-day free trial begins.</p>
      </div>
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 mb-4 text-[12.5px] text-slate-600 leading-relaxed">No bank account details are collected by GoBook. Razorpay checkout can show eligible UPI apps, UPI QR scan, and bank/card options. A ?1 verification payment is captured and an automatic refund is requested after server verification. GoBook never receives or stores your UPI ID, bank account, card number, or CVV.</div>
      <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 mb-5 flex gap-2.5 text-emerald-800 text-[12px]"><CheckCircle2 size={17} className="shrink-0" />Your 15-day trial starts only after Razorpay confirms this verification.</div>
      <p className="m-0 mb-5 text-[11.5px] leading-relaxed text-slate-500">Automatic renewal is separate: Razorpay must present a Subscription / UPI AutoPay mandate and the customer must approve it. A one-time ?1 verification never authorizes an automatic debit.</p>
      {error && <div className={`mb-4 rounded-xl px-4 py-2.5 ${ERROR_BOX}`}><span className={`text-[12.5px] ${ERROR_TEXT}`}>{error}</span></div>}
      <button type="button" disabled={submitting} onClick={verify} className="w-full flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-white font-bold text-[14px] border-0 cursor-pointer disabled:opacity-60" style={{ background: 'linear-gradient(135deg, #059669 0%, #16a34a 100%)' }}><CreditCard size={18} />{submitting ? 'Opening secure checkout?' : 'Verify & Start 1-Day Trial'}</button>
    </AuthLayout>
  );
}

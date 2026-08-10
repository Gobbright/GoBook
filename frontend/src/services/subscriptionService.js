import { apiClient } from './apiClient.js';
import { setSession } from './authToken.js';

export function fetchSubscriptionPlans(category) {
  return apiClient(`/subscriptions/plans?category=${encodeURIComponent(category)}`);
}
export async function verifyRegistrationPayment(payment) {
  const data = await apiClient('/subscriptions/verify-registration-payment', { method: 'POST', body: JSON.stringify(payment) });
  setSession(data.token, data.user);
  return data.user;
}
export function recordRegistrationPaymentFailure(orderId, error) {
  return apiClient('/subscriptions/registration-payment-failed', { method: 'POST', body: JSON.stringify({ orderId, error }) });
}

let checkoutScriptPromise;
function loadCheckoutScript() {
  if (window.Razorpay) return Promise.resolve();
  if (checkoutScriptPromise) return checkoutScriptPromise;
  checkoutScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.onload = resolve;
    script.onerror = () => reject(new Error('Unable to load the secure payment window'));
    document.head.appendChild(script);
  });
  return checkoutScriptPromise;
}

export async function openRazorpayCheckout(checkout) {
  await loadCheckoutScript();
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback, value) => {
      if (settled) return;
      settled = true;
      callback(value);
    };
    const instance = new window.Razorpay({
      key: checkout.keyId, order_id: checkout.orderId, amount: checkout.amount,
      currency: checkout.currency, name: 'GoBooks',
      description: `${checkout.planName} annual subscription`, image: '/favicon.svg',
      prefill: checkout.prefill, theme: { color: '#4f46e5' }, retry: { enabled: true },
      handler: (response) => finish(resolve, response),
      modal: { ondismiss: () => finish(reject, new Error('Payment was cancelled. Your account has not been created.')) },
    });
    instance.on('payment.failed', (response) => {
      const error = response?.error || {};
      recordRegistrationPaymentFailure(checkout.orderId, error).catch(() => {});
      finish(reject, new Error(error.description || 'Payment failed. Please try again.'));
    });
    instance.open();
  });
}

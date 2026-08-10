import { createHmac, timingSafeEqual } from 'crypto';
import { env } from '../config/env.js';
import { httpError } from '../utils/httpError.js';

const API_BASE = 'https://api.razorpay.com/v1';
export function isRazorpayConfigured() {
  return Boolean(env.razorpay.keyId && env.razorpay.keySecret);
}
function requireConfiguration() {
  if (!isRazorpayConfigured()) throw httpError(503, 'Online payment is temporarily unavailable. Contact support.');
}
async function razorpayRequest(path, options = {}) {
  requireConfiguration();
  const authorization = Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString('base64');
  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers: { Authorization: `Basic ${authorization}`, 'Content-Type': 'application/json', ...(options.headers || {}) },
      signal: AbortSignal.timeout(15000),
    });
  } catch {
    throw httpError(502, 'Unable to connect to the payment gateway. Please try again.');
  }
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const description = data?.error?.description || 'Payment gateway request failed';
    throw httpError(response.status >= 500 ? 502 : 400, description);
  }
  return data;
}
export function createRazorpayOrder(payload) {
  return razorpayRequest('/orders', { method: 'POST', body: JSON.stringify(payload) });
}
export function fetchRazorpayOrder(orderId) {
  return razorpayRequest(`/orders/${encodeURIComponent(orderId)}`);
}
export function fetchRazorpayPayment(paymentId) {
  return razorpayRequest(`/payments/${encodeURIComponent(paymentId)}`);
}
function secureCompare(expected, received) {
  const expectedBuffer = Buffer.from(String(expected || ''), 'utf8');
  const receivedBuffer = Buffer.from(String(received || ''), 'utf8');
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}
export function verifyCheckoutSignature({ orderId, paymentId, signature }) {
  requireConfiguration();
  const expected = createHmac('sha256', env.razorpay.keySecret).update(`${orderId}|${paymentId}`).digest('hex');
  return secureCompare(expected, signature);
}
export function verifyWebhookSignature(rawBody, signature) {
  if (!env.razorpay.webhookSecret) return false;
  const expected = createHmac('sha256', env.razorpay.webhookSecret).update(rawBody).digest('hex');
  return secureCompare(expected, signature);
}

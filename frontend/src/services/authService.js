import { apiClient } from './apiClient.js';
import { clearSession, getStoredUser, isAuthenticated, setSession } from './authToken.js';

export { getStoredUser as getCurrentUser, isAuthenticated };

export async function login(email, password) {
  const data = await apiClient('/auth/login', { method: 'POST', body: JSON.stringify({ email: email.trim(), password }) });
  setSession(data.token, data.user);
  return data.user;
}

export async function loginWithGoogle(credential) {
  const data = await apiClient('/auth/google', { method: 'POST', body: JSON.stringify({ credential }) });
  setSession(data.token, data.user);
  return data.user;
}



export async function resendEmailVerificationOtp() {
  return apiClient('/auth/resend-email-otp', { method: 'POST', body: JSON.stringify({}) });
}

export async function verifyEmailOtp(otp) {
  const data = await apiClient('/auth/verify-email', { method: 'POST', body: JSON.stringify({ otp }) });
  setSession(data.token, data.user);
  return data.user;
}
export async function completeGoogleOnboarding(payload) {
  const data = await apiClient('/auth/complete-google-onboarding', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  setSession(data.token, data.user);
  return data.user;
}
export async function register(payload) {
  const data = await apiClient('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ ...payload, email: payload.email.trim() }),
  });
  setSession(data.token, data.user);
  return data.user;
}

export async function requestPasswordReset(email) {
  return apiClient('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
}

export async function resetPasswordWithOtp({ email, otp, password }) {
  return apiClient('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, otp, password }),
  });
}

export function logout() {
  clearSession();
  window.location.assign('/login');
}

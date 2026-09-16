import assert from 'node:assert/strict';
import test, { afterEach, mock } from 'node:test';
import bcrypt from 'bcryptjs';
import nodemailer from 'nodemailer';
import { createHash } from 'node:crypto';

process.env.CLIENT_URL = 'http://localhost:5173';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:27017/unused-test-db';
process.env.JWT_SECRET = 'isolated-auth-test-secret';
const { startEmailOtpLogin, verifyEmailOtpLogin, startRegistration } = await import('../src/modules/auth/authController.js');
const { PendingEmailLogin } = await import('../src/models/PendingEmailLogin.js');
const { AppUser } = await import('../src/models/AppUser.js');
const { SubscriptionPlan } = await import('../src/models/SubscriptionPlan.js');
const { PendingSignup } = await import('../src/models/PendingSignup.js');
const { emailOtpRateLimit, EmailOtpRequestLimit } = await import('../src/middleware/emailOtpRateLimit.js');

afterEach(() => mock.restoreAll());
async function invoke(handler, body) {
  const result = { status: 200 };
  const res = { status(code) { result.status = code; return this; }, json(data) { result.data = data; return this; } };
  await handler({ body }, res, (error) => { result.error = error; });
  return result;
}
const email = 'person@example.com';
const otpHash = await bcrypt.hash('123456', 4);
function verificationMocks(user, { consumed = true, pending = true } = {}) {
  mock.method(PendingEmailLogin, 'findOneAndUpdate', (query, update) => {
    assert.equal(query.otpAttempts.$lt, 5);
    assert.ok(query.otpExpiresAt.$gt instanceof Date);
    assert.equal(update.$inc.otpAttempts, 1);
    return { select: async () => pending ? { _id: 'challenge', otpHash } : null };
  });
  const consume = mock.method(PendingEmailLogin, 'updateOne', async () => ({ modifiedCount: consumed ? 1 : 0 }));
  const lookup = mock.method(AppUser, 'findOne', async () => user);
  mock.method(AppUser, 'create', async () => { throw new Error('Verification must never create an account'); });
  return { consume, lookup };
}

test('rejects invalid emails before querying or sending mail', async () => {
  for (const value of ['', null, {}, 'invalid', 'a@b', 'a'.repeat(255) + '@example.com']) {
    const result = await invoke(startEmailOtpLogin, { email: value });
    assert.equal(result.error.statusCode, 400);
  }
});

test('email request sends a hashed OTP and no session or account information', async () => {
  let saved;
  let mail;
  mock.method(PendingEmailLogin, 'updateOne', async (_query, update) => { if (update.$set) saved = update.$set; return {}; });
  mock.method(PendingEmailLogin, 'findOneAndUpdate', async () => ({ _id: 'challenge', sendCount: 0 }));
  mock.method(AppUser, 'findOne', async () => { throw new Error('Account lookup before verification'); });
  mock.method(nodemailer, 'createTransport', () => ({ sendMail: async (data) => { mail = data; } }));
  const result = await invoke(startEmailOtpLogin, { email: ' PERSON@Example.com ' });
  assert.equal(result.status, 202);
  assert.equal(mail.to, email);
  assert.equal(result.data.token, undefined);
  assert.equal(result.data.existingAccount, undefined);
  const otp = mail.html.match(/>([0-9]{6})</)[1];
  assert.notEqual(saved.otpHash, otp);
  assert.equal(await bcrypt.compare(otp, saved.otpHash), true);
  assert.equal(saved.sendCount, 1);
  assert.equal(result.data.resendAfterSeconds, 60);
});

test('cooldown refuses sends and SMTP failure invalidates the unsent code', async () => {
  const update = mock.method(PendingEmailLogin, 'updateOne', async () => ({}));
  const claim = mock.method(PendingEmailLogin, 'findOneAndUpdate', async () => null);
  assert.equal((await invoke(startEmailOtpLogin, { email })).error.statusCode, 429);
  claim.mock.mockImplementation(async () => ({ _id: 'challenge', sendCount: 0 }));
  mock.method(nodemailer, 'createTransport', () => ({ sendMail: async () => { throw new Error('SMTP credentials must not leak'); } }));
  const result = await invoke(startEmailOtpLogin, { email });
  assert.equal(result.error.statusCode, 503);
  assert.doesNotMatch(result.error.message, /credentials/);
  assert.equal(update.mock.calls.at(-1).arguments[1].$unset.otpHash, 1);
});

test('existing account gets a session only after correct OTP', async () => {
  const user = { _id: 'user-id', email, name: 'Person', status: 'Active', category: 'school', onboardingCompleted: true, save: async () => {} };
  verificationMocks(user);
  const result = await invoke(verifyEmailOtpLogin, { email, otp: '123456' });
  assert.ok(result.data.token);
  assert.equal(result.data.user.id, 'user-id');
  assert.equal(result.data.user.emailVerified, true);
  assert.equal(result.data.user.needsOnboarding, false);
});

test('new email gets only a scoped signup proof without creating an account', async () => {
  const { consume } = verificationMocks(null);
  const result = await invoke(verifyEmailOtpLogin, { email, otp: '123456' });
  assert.equal(result.data.registrationRequired, true);
  assert.equal(result.data.token, undefined);
  assert.match(result.data.signupToken, /^[a-f0-9]{64}$/);
  const stored = consume.mock.calls[0].arguments[1].$set.signupTokenHash;
  assert.equal(stored, createHash('sha256').update(result.data.signupToken).digest('hex'));
});

test('wrong OTP does not consume the challenge or look up an account', async () => {
  const { consume, lookup } = verificationMocks(null);
  const result = await invoke(verifyEmailOtpLogin, { email, otp: '654321' });
  assert.equal(result.error.statusCode, 400);
  assert.equal(consume.mock.callCount(), 0);
  assert.equal(lookup.mock.callCount(), 0);
});

test('expired or exhausted challenge cannot log in', async () => {
  const { lookup } = verificationMocks(null, { pending: false });
  assert.equal((await invoke(verifyEmailOtpLogin, { email, otp: '123456' })).error.statusCode, 400);
  assert.equal(lookup.mock.callCount(), 0);
});

test('a concurrent or repeated consumption cannot issue a session', async () => {
  const { lookup } = verificationMocks(null, { consumed: false });
  assert.equal((await invoke(verifyEmailOtpLogin, { email, otp: '123456' })).error.statusCode, 400);
  assert.equal(lookup.mock.callCount(), 0);
});

test('blocked accounts cannot log in even with a valid OTP', async () => {
  verificationMocks({ status: 'Blocked' });
  const result = await invoke(verifyEmailOtpLogin, { email, otp: '123456' });
  assert.equal(result.error.statusCode, 403);
  assert.equal(result.data, undefined);
});

test('signup rejects forged, expired or differently bound email verification', async () => {
  mock.method(SubscriptionPlan, 'bulkWrite', async () => ({}));
  mock.method(SubscriptionPlan, 'findOne', () => ({ lean: async () => ({ amount: 10 }) }));
  mock.method(AppUser, 'exists', async () => null);
  mock.method(PendingEmailLogin, 'exists', async (query) => {
    assert.equal(query.email, email);
    assert.ok(query.signupExpiresAt.$gt instanceof Date);
    return null;
  });
  mock.method(PendingSignup, 'findOneAndUpdate', () => { throw new Error('Must reject before signup writes'); });
  const result = await invoke(startRegistration, {
    email, signupToken: 'a'.repeat(64), name: 'Person', password: 'password123',
    businessName: 'Business', phone: '9876543210', category: 'school', subscriptionPlan: 'basic',
  });
  assert.equal(result.error.statusCode, 400);
  assert.match(result.error.message, /verification expired/);
});

test('IP rate limit prevents sending to unlimited different email addresses', async () => {
  mock.method(EmailOtpRequestLimit, 'findOneAndUpdate', async () => ({ count: 21 }));
  const result = await invoke(emailOtpRateLimit, {});
  assert.equal(result.error.statusCode, 429);
});

for (const paymentRequired of [false, true]) {
  test(`verified email completes signup without another OTP; payment=${paymentRequired}`, async () => {
    const { env } = await import('../src/config/env.js');
    const { Business } = await import('../src/models/Business.js');
    const { BusinessSettings } = await import('../src/models/BusinessSettings.js');
    const { AdminNotification } = await import('../src/models/AdminNotification.js');
    const { SubscriptionPayment } = await import('../src/models/SubscriptionPayment.js');
    const originalPaymentRequired = env.paymentRequired;
    const originalRazorpay = env.razorpay;
    env.paymentRequired = paymentRequired;
    env.razorpay = { keyId: 'test-key', keySecret: 'test-secret' };
    try {
      mock.method(SubscriptionPlan, 'bulkWrite', async () => ({}));
      mock.method(SubscriptionPlan, 'findOne', () => ({ lean: async () => ({ amount: 10, name: 'Basic' }) }));
      mock.method(AppUser, 'exists', async () => null);
      mock.method(AppUser, 'findOne', async () => null);
      mock.method(PendingEmailLogin, 'exists', async () => ({ _id: 'challenge' }));
      mock.method(PendingSignup, 'findOneAndUpdate', (_query, update) => ({ select: async (selection) => {
        assert.equal(selection, '+password');
        return { _id: 'pending', ...update.$set, save: async () => {} };
      } }));
      mock.method(PendingSignup, 'deleteOne', async () => ({}));
      mock.method(Business, 'create', async () => ({ _id: 'business' }));
      mock.method(BusinessSettings, 'create', async () => ({}));
      mock.method(AdminNotification, 'findOneAndUpdate', async () => ({}));
      const created = mock.method(AppUser, 'create', async (payload) => {
        assert.equal(await bcrypt.compare('password123', payload.password), true);
        assert.equal(payload.emailVerified, true);
        return { _id: 'new-user', ...payload };
      });
      mock.method(nodemailer, 'createTransport', () => { throw new Error('Already verified: do not send another OTP'); });
      mock.method(globalThis, 'fetch', async () => ({ ok: true, json: async () => ({ id: 'order_test' }) }));
      mock.method(SubscriptionPayment, 'create', async (payload) => ({ toObject: () => payload }));
      const result = await invoke(startRegistration, {
        email, signupToken: 'a'.repeat(64), name: 'Person', password: 'password123',
        businessName: 'Business', phone: '9876543210', category: 'school', subscriptionPlan: 'basic',
      });
      assert.equal(result.error, undefined);
      assert.equal(result.status, 201);
      assert.ok(result.data.token);
      assert.equal(result.data.user.email, email);
      assert.equal(result.data.user.subscriptionStatus, 'trial');
      assert.equal(result.data.user.trialExpired, false);
      assert.ok(result.data.user.trialEndsAt);
      assert.equal(result.data.paymentRequired, undefined);
      assert.equal(created.mock.callCount(), 1);
    } finally {
      env.paymentRequired = originalPaymentRequired;
      env.razorpay = originalRazorpay;
    }
  });
}

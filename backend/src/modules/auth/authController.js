import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

import { env } from '../../config/env.js';
import { CATEGORIES } from '../../constants/categories.js';
import { AppUser } from '../../models/AppUser.js';
import { Business } from '../../models/Business.js';
import { BusinessSettings } from '../../models/BusinessSettings.js';
import { PendingSignup } from '../../models/PendingSignup.js';
import { PendingGoogleLogin } from '../../models/PendingGoogleLogin.js';
import { httpError } from '../../utils/httpError.js';
import { sendMail } from '../../utils/mailer.js';

const SALT_ROUNDS = 10;
const RESET_OTP_EXPIRES_MINUTES = 10;
const RESET_OTP_MAX_ATTEMPTS = 5;
const EMAIL_VERIFY_OTP_EXPIRES_MINUTES = 10;
const EMAIL_VERIFY_OTP_MAX_ATTEMPTS = 5;
const SIGNUP_OTP_EXPIRES_MINUTES = 10;
const SIGNUP_OTP_MAX_ATTEMPTS = 5;
const GOOGLE_OTP_EXPIRES_MINUTES = 10;
const GOOGLE_OTP_MAX_ATTEMPTS = 5;
const SUBSCRIPTION_AMOUNTS = { starter: 499, professional: 999, enterprise: 1999 };
const SUBSCRIPTION_PLANS = Object.keys(SUBSCRIPTION_AMOUNTS);

const googleClient = env.googleClientId ? new OAuth2Client(env.googleClientId) : null;

function signToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      businessId: user.businessId?.toString(),
      category: user.category || 'retail',
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );
}

function toSafeUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    branch: user.branch,
    phone: user.phone,
    businessId: user.businessId,
    businessName: user.businessName,
    category: user.category || 'retail',
    subscriptionPlan: user.subscriptionPlan || '',
    onboardingCompleted: Boolean(user.onboardingCompleted),
    emailVerified: Boolean(user.emailVerified || user.googleId),
    needsEmailVerification: Boolean(!user.googleId && !user.emailVerified),
    needsOnboarding: Boolean(!user.onboardingCompleted),
    status: user.status,
    lastLogin: user.lastLogin,
    authProvider: user.authProvider || (user.googleId ? 'google' : 'email'),
    avatarUrl: user.googleProfile?.picture || '',
  };
}

// Creates a brand-new business owned by the first user who signs up for it.
async function createBusinessForNewUser(businessName, fallbackName, category = 'retail') {
  const business = await Business.create({
    name: businessName?.trim() || `${fallbackName}'s Business`,
    category,
  });
  return business;
}

function normalizeEmail(email = '') {
  return email.trim().toLowerCase();
}

function validatePassword(password) {
  if (!password) throw httpError(400, 'Password is required');
  if (password.length < 8) throw httpError(400, 'Password must be at least 8 characters');
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw httpError(400, 'Password must include at least one letter and one number');
  }
}

async function ensureEmailAvailable(email, excludeUserId = null) {
  const query = { email };
  if (excludeUserId) query._id = { $ne: excludeUserId };
  const existing = await AppUser.exists(query);
  if (existing) throw httpError(409, 'Email already registered. Use another email address.');
}

function buildGoogleProfile(payload, email) {
  return {
    subject: payload.sub || '',
    email,
    emailVerified: Boolean(payload.email_verified),
    name: payload.name || '',
    givenName: payload.given_name || '',
    familyName: payload.family_name || '',
    picture: payload.picture || '',
    locale: payload.locale || '',
    hostedDomain: payload.hd || '',
    issuer: payload.iss || '',
    audience: payload.aud || '',
    authorizedParty: payload.azp || '',
    lastSyncedAt: new Date(),
  };
}

async function verifyGoogleCredential(credential) {
  if (!googleClient) throw httpError(500, 'Google sign-in is not configured');
  if (!credential) throw httpError(400, 'Google credential is required');

  let payload;
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.googleClientId });
    payload = ticket.getPayload();
  } catch {
    throw httpError(401, 'Invalid Google credential');
  }

  const email = normalizeEmail(payload?.email);
  if (!email || !payload?.sub || !payload.email_verified) {
    throw httpError(401, 'Google account email is not verified');
  }

  return { email, payload };
}

async function ensureBusinessSettingsForUser(user) {
  await BusinessSettings.findOneAndUpdate(
    { userId: user._id },
    {
      $setOnInsert: {
        userId: user._id,
        businessName: user.businessName || `${user.name}'s Business`,
        businessEmail: user.email,
        phone: user.phone || '',
      },
    },
    { upsert: true, setDefaultsOnInsert: true },
  );
}

function createResetOtp() {
  return String(randomInt(100000, 1000000));
}

function getResetOtpEmailHtml({ name, otp }) {
  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <h2 style="margin: 0 0 12px;">Reset your GoBook password</h2>
      <p style="margin: 0 0 12px;">Hi ${name || 'there'},</p>
      <p style="margin: 0 0 16px;">Use this OTP on the GoBook reset password page. It expires in ${RESET_OTP_EXPIRES_MINUTES} minutes.</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 0 0 16px;">${otp}</p>
      <p style="margin: 0; color: #536173;">If you did not request this, you can ignore this email.</p>
    </div>
  `;
}
function getEmailVerificationHtml({ name, otp }) {
  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <h2 style="margin: 0 0 12px;">Verify your GoBook email</h2>
      <p style="margin: 0 0 12px;">Hi ${name || 'there'},</p>
      <p style="margin: 0 0 16px;">Use this OTP to verify your email address. It expires in ${EMAIL_VERIFY_OTP_EXPIRES_MINUTES} minutes.</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 0 0 16px;">${otp}</p>
      <p style="margin: 0; color: #536173;">If you did not create a GoBook account, you can ignore this email.</p>
    </div>
  `;
}

function getGoogleOtpEmailHtml({ name, otp }) {
  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <h2 style="margin: 0 0 12px;">Your GoBook Google login OTP</h2>
      <p style="margin: 0 0 12px;">Hi ${name || 'there'},</p>
      <p style="margin: 0 0 16px;">Use this OTP to continue with Google email login. It expires in ${GOOGLE_OTP_EXPIRES_MINUTES} minutes.</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 0 0 16px;">${otp}</p>
      <p style="margin: 0; color: #536173;">If you did not request this, you can ignore this email.</p>
    </div>
  `;
}
function getSignupOtpEmailHtml({ name, otp }) {
  return `
    <div style="font-family: Arial, sans-serif; color: #111827; line-height: 1.5;">
      <h2 style="margin: 0 0 12px;">Verify your GoBook signup</h2>
      <p style="margin: 0 0 12px;">Hi ${name || 'there'},</p>
      <p style="margin: 0 0 16px;">Use this OTP to finish creating your GoBook account. It expires in ${SIGNUP_OTP_EXPIRES_MINUTES} minutes.</p>
      <p style="font-size: 28px; font-weight: 700; letter-spacing: 6px; margin: 0 0 16px;">${otp}</p>
      <p style="margin: 0; color: #536173;">Your account will be created only after this OTP is verified.</p>
    </div>
  `;
}
async function sendEmailVerificationOtp(user) {
  const otp = createResetOtp();
  user.emailVerificationOtpHash = await bcrypt.hash(otp, SALT_ROUNDS);
  user.emailVerificationOtpExpiresAt = new Date(Date.now() + EMAIL_VERIFY_OTP_EXPIRES_MINUTES * 60 * 1000);
  user.emailVerificationOtpAttempts = 0;
  await user.save();

  await sendMail({
    to: user.email,
    subject: 'Verify your GoBook email',
    html: getEmailVerificationHtml({ name: user.name, otp }),
  });
}

async function createPendingSignupOtp() {
  const otp = createResetOtp();
  return {
    otp,
    otpHash: await bcrypt.hash(otp, SALT_ROUNDS),
    otpExpiresAt: new Date(Date.now() + SIGNUP_OTP_EXPIRES_MINUTES * 60 * 1000),
  };
}

function getSignupPayload(req) {
  const name = String(req.body.name ?? '').trim();
  const email = normalizeEmail(req.body.email);
  const password = String(req.body.password ?? '');
  const businessName = String(req.body.businessName ?? '').trim();
  const category = String(req.body.category ?? '').trim();
  const phone = String(req.body.phone ?? '').trim();
  const gstin = String(req.body.gstin ?? '').trim().toUpperCase();
  const subscriptionPlan = String(req.body.subscriptionPlan ?? '').trim();

  return {
    name,
    email,
    password,
    businessName,
    category,
    phone,
    gstin,
    subscriptionPlan,
    subscriptionAmount: SUBSCRIPTION_AMOUNTS[subscriptionPlan] || 0,
  };
}

async function validateSignupPayload(payload) {
  if (!payload.name || !payload.email || !payload.password) throw httpError(400, 'Name, email and password are required');
  validatePassword(payload.password);
  if (!payload.businessName || payload.businessName.length < 2) throw httpError(400, 'Business name is required');
  if (!payload.phone) throw httpError(400, 'Phone number is required');
  if (!CATEGORIES.includes(payload.category)) throw httpError(400, 'Select a valid business category');
  if (!SUBSCRIPTION_PLANS.includes(payload.subscriptionPlan)) throw httpError(400, 'Select a valid plan');

  await ensureEmailAvailable(payload.email);
}

// POST /api/auth/register
export async function startRegistration(req, res, next) {
  try {
    const payload = getSignupPayload(req);
    await validateSignupPayload(payload);

    const { otp, otpHash, otpExpiresAt } = await createPendingSignupOtp();
    await PendingSignup.findOneAndUpdate(
      { email: payload.email },
      {
        $set: {
          ...payload,
          password: await bcrypt.hash(payload.password, SALT_ROUNDS),
          otpHash,
          otpExpiresAt,
          otpAttempts: 0,
        },
      },
      { upsert: true, setDefaultsOnInsert: true },
    );

    await sendMail({
      to: payload.email,
      subject: 'Your GoBook signup OTP',
      html: getSignupOtpEmailHtml({ name: payload.name, otp }),
    });

    res.status(202).json({
      message: 'OTP sent to your email. Verify it to create your account.',
      email: payload.email,
      expiresInMinutes: SIGNUP_OTP_EXPIRES_MINUTES,
    });
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, 'Email already registered. Use another email address.'));
    next(err);
  }
}

export async function register(req, res, next) {
  return startRegistration(req, res, next);
}

// POST /api/auth/register/verify-otp
export async function verifyRegistrationOtp(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || '').trim();

    if (!email) return next(httpError(400, 'Email is required'));
    if (!/^\d{6}$/.test(otp)) return next(httpError(400, 'OTP must be 6 digits'));
    await ensureEmailAvailable(email);

    const pending = await PendingSignup.findOne({ email }).select('+password +otpHash +otpExpiresAt +otpAttempts');
    if (!pending || !pending.otpHash || !pending.otpExpiresAt) return next(httpError(400, 'Invalid or expired OTP'));
    if (pending.otpExpiresAt.getTime() < Date.now()) {
      await PendingSignup.deleteOne({ _id: pending._id });
      return next(httpError(400, 'Invalid or expired OTP'));
    }
    if (pending.otpAttempts >= SIGNUP_OTP_MAX_ATTEMPTS) return next(httpError(429, 'Too many OTP attempts. Request a new OTP'));
    const valid = await bcrypt.compare(otp, pending.otpHash);
    if (!valid) {
      pending.otpAttempts += 1;
      await pending.save();
      return next(httpError(400, 'Invalid or expired OTP'));
    }

    const business = await createBusinessForNewUser(pending.businessName, pending.name, pending.category);
    const user = await AppUser.create({
      name: pending.name,
      email: pending.email,
      password: pending.password,
      businessId: business._id,
      businessName: pending.businessName,
      category: pending.category,
      phone: pending.phone,
      role: 'Super Admin',
      lastLogin: new Date().toISOString(),
      subscriptionPlan: pending.subscriptionPlan,
      subscriptionAmount: pending.subscriptionAmount,
      onboardingCompleted: true,
      emailVerified: true,
    });

    await BusinessSettings.create({
      userId: user._id,
      businessName: pending.businessName,
      businessEmail: pending.email,
      phone: pending.phone,
      gstin: pending.gstin,
    });

    await PendingSignup.deleteOne({ _id: pending._id });

    const token = signToken(user);
    res.status(201).json({ token, user: toSafeUser(user) });
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, 'Email already registered. Use another email address.'));
    next(err);
  }
}

// POST /api/auth/login
export async function login(req, res, next) {
  try {
    const { email, password } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!normalizedEmail || !password) {
      return next(httpError(400, 'Email and password are required'));
    }

    const user = await AppUser.findOne({ email: normalizedEmail }).select('+password');
    if (!user || !user.password || !(await bcrypt.compare(password, user.password))) {
      return next(httpError(401, 'Invalid email or password'));
    }
    if (user.status !== 'Active') {
      return next(httpError(403, 'Account is not active'));
    }
    if (!user.emailVerified) user.emailVerified = true;
    user.lastLogin = new Date().toISOString();
    await user.save();

    const token = signToken(user);
    res.json({ token, user: toSafeUser(user) });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/google-otp/start
export async function startGoogleOtpLogin(req, res, next) {
  try {
    const { email, payload } = await verifyGoogleCredential(req.body.credential);
    const googleProfile = buildGoogleProfile(payload, email);
    const existing = await AppUser.findOne({ $or: [{ email }, { googleId: payload.sub }] }).select('name email status');
    if (existing && existing.status !== 'Active') return next(httpError(403, 'Account is not active'));
    if (existing) {
      await PendingGoogleLogin.deleteMany({ $or: [{ email }, { googleId: payload.sub }] });
      return res.json({
        existingAccount: true,
        email: existing.email,
        message: 'Account found. Enter your password to sign in.',
      });
    }

    const otp = createResetOtp();
    await PendingGoogleLogin.findOneAndUpdate(
      { email },
      {
        $set: {
          email,
          googleId: payload.sub,
          googleProfile,
          otpHash: await bcrypt.hash(otp, SALT_ROUNDS),
          otpExpiresAt: new Date(Date.now() + GOOGLE_OTP_EXPIRES_MINUTES * 60 * 1000),
          otpAttempts: 0,
        },
      },
      { upsert: true, setDefaultsOnInsert: true },
    );

    await sendMail({
      to: email,
      subject: 'Your GoBook Google login OTP',
      html: getGoogleOtpEmailHtml({ name: existing?.name || googleProfile.name || email.split('@')[0], otp }),
    });

    res.json({ existingAccount: false, message: 'OTP sent to your Google email', email, expiresInMinutes: GOOGLE_OTP_EXPIRES_MINUTES });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/google-otp/verify
export async function verifyGoogleOtpLogin(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || '').trim();

    if (!email) return next(httpError(400, 'Email is required'));
    if (!/^\d{6}$/.test(otp)) return next(httpError(400, 'OTP must be 6 digits'));
    const pending = await PendingGoogleLogin.findOne({ email }).select('+googleId +googleProfile +otpHash +otpExpiresAt +otpAttempts');
    if (!pending || !pending.otpHash || !pending.otpExpiresAt) return next(httpError(400, 'Invalid or expired OTP'));
    if (pending.otpExpiresAt.getTime() < Date.now()) {
      await PendingGoogleLogin.deleteOne({ _id: pending._id });
      return next(httpError(400, 'Invalid or expired OTP'));
    }
    if (pending.otpAttempts >= GOOGLE_OTP_MAX_ATTEMPTS) return next(httpError(429, 'Too many OTP attempts. Request a new OTP'));
    const valid = await bcrypt.compare(otp, pending.otpHash);
    if (!valid) {
      pending.otpAttempts += 1;
      await pending.save();
      return next(httpError(400, 'Invalid or expired OTP'));
    }

    const existing = await AppUser.exists({ $or: [{ email }, { googleId: pending.googleId }] });
    if (existing) {
      await PendingGoogleLogin.deleteOne({ _id: pending._id });
      return next(httpError(409, 'Account already exists. Sign in with your password.'));
    }

    const name = pending.googleProfile?.name || email.split('@')[0].replace(/[._-]+/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
    const user = await AppUser.create({
      name,
      email,
      googleId: pending.googleId,
      authProvider: 'google',
      emailVerified: true,
      googleProfile: pending.googleProfile,
      role: 'Super Admin',
      lastLogin: new Date().toISOString(),
      onboardingCompleted: false,
    });

    await PendingGoogleLogin.deleteOne({ _id: pending._id });

    const token = signToken(user);
    res.json({ token, user: toSafeUser(user) });
  } catch (err) {
    next(err);
  }
}
// POST /api/auth/complete-google-onboarding
export async function completeGoogleOnboarding(req, res, next) {
  try {
    const user = await AppUser.findById(req.user.id);
    if (!user) return next(httpError(404, 'User not found'));
    const businessName = String(req.body.businessName ?? '').trim();
    const category = String(req.body.category ?? '').trim();
    const phone = String(req.body.phone ?? '').trim();
    const gstin = String(req.body.gstin ?? '').trim().toUpperCase();
    const subscriptionPlan = String(req.body.subscriptionPlan ?? '').trim();
    const password = String(req.body.password ?? '');

    if (!businessName || businessName.length < 2) return next(httpError(400, 'Business name is required'));
    if (!CATEGORIES.includes(category)) return next(httpError(400, 'Select a valid business category'));
    if (!phone) return next(httpError(400, 'Phone number is required'));
    if (!SUBSCRIPTION_PLANS.includes(subscriptionPlan)) return next(httpError(400, 'Select a valid plan'));
    validatePassword(password);

    let business;
    if (user.businessId) {
      business = await Business.findByIdAndUpdate(user.businessId, { name: businessName, category }, { new: true });
    }
    if (!business) business = await createBusinessForNewUser(businessName, user.name, category);

    user.businessId = business._id;
    user.businessName = business.name;
    user.category = category;
    user.phone = phone;
    user.subscriptionPlan = subscriptionPlan;
    user.password = await bcrypt.hash(password, SALT_ROUNDS);
    user.onboardingCompleted = true;
    await user.save();

    await BusinessSettings.findOneAndUpdate(
      { userId: user._id },
      { $set: { businessName: business.name, businessEmail: user.email, phone, gstin } },
      { upsert: true, setDefaultsOnInsert: true },
    );

    const token = signToken(user);
    res.json({ token, user: toSafeUser(user) });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/resend-email-otp
export async function resendEmailVerificationOtp(req, res, next) {
  try {
    const user = await AppUser.findById(req.user.id).select('+emailVerificationOtpHash +emailVerificationOtpExpiresAt +emailVerificationOtpAttempts');
    if (!user) return next(httpError(404, 'User not found'));
    if (user.googleId || user.emailVerified) return res.json({ message: 'Email already verified' });

    await sendEmailVerificationOtp(user);
    res.json({ message: 'Verification OTP sent to your email' });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/verify-email
export async function verifyEmailOtp(req, res, next) {
  try {
    const otp = String(req.body.otp || '').trim();
    if (!/^\d{6}$/.test(otp)) return next(httpError(400, 'OTP must be 6 digits'));
    const user = await AppUser.findById(req.user.id).select('+emailVerificationOtpHash +emailVerificationOtpExpiresAt +emailVerificationOtpAttempts');
    if (!user) return next(httpError(404, 'User not found'));
    if (user.googleId || user.emailVerified) return res.json({ token: signToken(user), user: toSafeUser(user) });
    if (!user.emailVerificationOtpHash || !user.emailVerificationOtpExpiresAt) return next(httpError(400, 'Invalid or expired OTP'));
    if (user.emailVerificationOtpExpiresAt.getTime() < Date.now()) {
      user.emailVerificationOtpHash = '';
      user.emailVerificationOtpExpiresAt = undefined;
      user.emailVerificationOtpAttempts = 0;
      await user.save();
      return next(httpError(400, 'Invalid or expired OTP'));
    }
    if (user.emailVerificationOtpAttempts >= EMAIL_VERIFY_OTP_MAX_ATTEMPTS) {
      return next(httpError(429, 'Too many OTP attempts. Request a new OTP'));
    }

    const valid = await bcrypt.compare(otp, user.emailVerificationOtpHash);
    if (!valid) {
      user.emailVerificationOtpAttempts += 1;
      await user.save();
      return next(httpError(400, 'Invalid or expired OTP'));
    }

    user.emailVerified = true;
    user.emailVerificationOtpHash = '';
    user.emailVerificationOtpExpiresAt = undefined;
    user.emailVerificationOtpAttempts = 0;
    user.lastLogin = new Date().toISOString();
    await user.save();

    const token = signToken(user);
    res.json({ token, user: toSafeUser(user) });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/forgot-password
export async function forgotPassword(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);

    if (!email) {
      return next(httpError(400, 'Email is required'));
    }

    const user = await AppUser.findOne({ email }).select('+resetOtpHash +resetOtpExpiresAt +resetOtpAttempts');
    if (!user) {
      return next(httpError(404, 'Email is not registered'));
    }
    if (user.status !== 'Active') {
      return next(httpError(403, 'Account is not active'));
    }

    const otp = createResetOtp();
    user.resetOtpHash = await bcrypt.hash(otp, SALT_ROUNDS);
    user.resetOtpExpiresAt = new Date(Date.now() + RESET_OTP_EXPIRES_MINUTES * 60 * 1000);
    user.resetOtpAttempts = 0;
    await user.save();

    await sendMail({
      to: user.email,
      subject: 'Your GoBook password reset OTP',
      html: getResetOtpEmailHtml({ name: user.name, otp }),
    });

    res.json({ message: 'OTP sent to your registered email' });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/reset-password
export async function resetPassword(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || '').trim();
    const { password } = req.body;

    if (!email || !otp || !password) {
      return next(httpError(400, 'Email, OTP and new password are required'));
    }
    if (!/^\d{6}$/.test(otp)) {
      return next(httpError(400, 'OTP must be 6 digits'));
    }
    validatePassword(password);

    const user = await AppUser.findOne({ email }).select('+password +resetOtpHash +resetOtpExpiresAt +resetOtpAttempts');
    if (!user || !user.resetOtpHash || !user.resetOtpExpiresAt) {
      return next(httpError(400, 'Invalid or expired OTP'));
    }
    if (user.resetOtpExpiresAt.getTime() < Date.now()) {
      user.resetOtpHash = '';
      user.resetOtpExpiresAt = undefined;
      user.resetOtpAttempts = 0;
      await user.save();
      return next(httpError(400, 'Invalid or expired OTP'));
    }
    if (user.resetOtpAttempts >= RESET_OTP_MAX_ATTEMPTS) {
      return next(httpError(429, 'Too many OTP attempts. Request a new OTP'));
    }

    const isValidOtp = await bcrypt.compare(otp, user.resetOtpHash);
    if (!isValidOtp) {
      user.resetOtpAttempts += 1;
      await user.save();
      return next(httpError(400, 'Invalid or expired OTP'));
    }

    user.password = await bcrypt.hash(password, SALT_ROUNDS);
    user.resetOtpHash = '';
    user.resetOtpExpiresAt = undefined;
    user.resetOtpAttempts = 0;
    await user.save();

    res.json({ message: 'Password reset successfully' });
  } catch (err) {
    next(err);
  }
}

// GET /api/auth/me
export async function getMe(req, res, next) {
  try {
    const user = await AppUser.findById(req.user.id).lean();
    if (!user) return next(httpError(404, 'User not found'));
    res.json(toSafeUser(user));
  } catch (err) {
    next(err);
  }
}

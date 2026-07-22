import bcrypt from 'bcryptjs';
import { randomInt } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

import { env } from '../../config/env.js';
import { CATEGORIES } from '../../constants/categories.js';
import { AppUser } from '../../models/AppUser.js';
import { Business } from '../../models/Business.js';
import { BusinessSettings } from '../../models/BusinessSettings.js';
import { httpError } from '../../utils/httpError.js';
import { sendMail } from '../../utils/mailer.js';

const SALT_ROUNDS = 10;
const RESET_OTP_EXPIRES_MINUTES = 10;
const RESET_OTP_MAX_ATTEMPTS = 5;
const EMAIL_VERIFY_OTP_EXPIRES_MINUTES = 10;
const EMAIL_VERIFY_OTP_MAX_ATTEMPTS = 5;
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
    needsOnboarding: Boolean(user.googleId && !user.onboardingCompleted),
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

// POST /api/auth/register
export async function register(req, res, next) {
  try {
    const { name, email, password, businessName = '', category = '', phone = '', gstin = '' } = req.body;
    const normalizedEmail = normalizeEmail(email);

    if (!name || !normalizedEmail || !password) {
      return next(httpError(400, 'Name, email and password are required'));
    }
    if (password.length < 8) {
      return next(httpError(400, 'Password must be at least 8 characters'));
    }
    if (!CATEGORIES.includes(category)) {
      return next(httpError(400, 'Select a valid business category'));
    }

    const existing = await AppUser.findOne({ email: normalizedEmail });
    if (existing) {
      return next(httpError(409, 'Email already registered'));
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const business = await createBusinessForNewUser(businessName, name, category);

    const user = await AppUser.create({
      name: name.trim(),
      email: normalizedEmail,
      password: passwordHash,
      businessId: business._id,
      businessName: businessName.trim(),
      category,
      phone: phone.trim(),
      role: 'Super Admin',
      lastLogin: new Date().toISOString(),
      subscriptionPlan: 'professional',
      onboardingCompleted: true,
      emailVerified: false,
    });

    await BusinessSettings.create({
      userId: user._id,
      businessName: businessName.trim(),
      businessEmail: normalizedEmail,
      phone: phone.trim(),
      gstin: gstin.trim(),
    });

    await sendEmailVerificationOtp(user);

    const token = signToken(user);
    res.status(201).json({ token, user: toSafeUser(user) });
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, 'Email already registered'));
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
    if (!user.googleId && !user.emailVerified) {
      await sendEmailVerificationOtp(user);
      const token = signToken(user);
      return res.json({ token, user: toSafeUser(user), message: 'Email verification required. OTP sent to your email.' });
    }

    user.lastLogin = new Date().toISOString();
    await user.save();

    const token = signToken(user);
    res.json({ token, user: toSafeUser(user) });
  } catch (err) {
    next(err);
  }
}

// POST /api/auth/google
export async function googleLogin(req, res, next) {
  try {
    if (!googleClient) {
      return next(httpError(500, 'Google sign-in is not configured'));
    }

    const { credential } = req.body;
    if (!credential) {
      return next(httpError(400, 'Google credential is required'));
    }

    let payload;
    try {
      const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.googleClientId });
      payload = ticket.getPayload();
    } catch {
      return next(httpError(401, 'Invalid Google credential'));
    }

    const email = normalizeEmail(payload?.email);
    if (!email || !payload.email_verified) {
      return next(httpError(401, 'Google account email is not verified'));
    }

    const now = new Date().toISOString();
    const googleProfile = buildGoogleProfile(payload, email);
    let user = await AppUser.findOne({ $or: [{ email }, { googleId: payload.sub }] });

    if (user) {
      if (user.status !== 'Active') {
      return next(httpError(403, 'Account is not active'));
    }

      user.googleId = payload.sub;
      user.authProvider = 'google';
      user.emailVerified = true;
      user.googleProfile = googleProfile;
      user.lastLogin = now;
      if (!user.name && googleProfile.name) user.name = googleProfile.name;
      await user.save();
    } else {
      const name = googleProfile.name || email.split('@')[0];
      user = await AppUser.create({
        name,
        email,
        googleId: payload.sub,
        authProvider: 'google',
        emailVerified: true,
        googleProfile,
        role: 'Super Admin',
        lastLogin: now,
        onboardingCompleted: false,
      });
    }

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
    if (!user.googleId) return next(httpError(400, 'Google onboarding is only for Google sign-in accounts'));

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
    if (!password || password.length < 8) return next(httpError(400, 'Password must be at least 8 characters'));

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
    if (password.length < 8) {
      return next(httpError(400, 'Password must be at least 8 characters'));
    }

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


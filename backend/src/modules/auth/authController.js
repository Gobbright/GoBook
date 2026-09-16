import bcrypt from 'bcryptjs';
import { createHash, randomBytes, randomInt } from 'crypto';
import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

import { env } from '../../config/env.js';
import { CATEGORIES, RETAIL_SUBCATEGORIES } from '../../constants/categories.js';
import { AppUser } from '../../models/AppUser.js';
import { Business } from '../../models/Business.js';
import { BusinessSettings } from '../../models/BusinessSettings.js';
import { PendingSignup } from '../../models/PendingSignup.js';
import { PendingEmailLogin } from '../../models/PendingEmailLogin.js';
import { httpError } from '../../utils/httpError.js';
import { buildBrandedEmail, sendMail } from '../../utils/mailer.js';
import { completeFreeSignup } from '../../services/registrationPayments.js';
import { getActivePlan, PLAN_TIERS } from '../../services/subscriptionPlans.js';

const SALT_ROUNDS = 10;
const RESET_OTP_EXPIRES_MINUTES = 10;
const RESET_OTP_MAX_ATTEMPTS = 5;
const EMAIL_VERIFY_OTP_EXPIRES_MINUTES = 10;
const EMAIL_VERIFY_OTP_MAX_ATTEMPTS = 5;
const SIGNUP_OTP_EXPIRES_MINUTES = 10;
const SIGNUP_OTP_MAX_ATTEMPTS = 5;
const LOGIN_OTP_EXPIRES_MINUTES = 10;
const LOGIN_OTP_MAX_ATTEMPTS = 5;
const SUBSCRIPTION_PLANS = PLAN_TIERS;
const LEGACY_RETAIL_SUBCATEGORY = 'electronics-technology';

const googleClient = env.googleClientId ? new OAuth2Client(env.googleClientId) : null;

function isTrialExpired(user) {
  return user.subscriptionStatus === 'trial'
    && user.trialEndsAt
    && new Date(user.trialEndsAt).getTime() <= Date.now();
}

export function signToken(user) {
  const isSuperAdmin = user.accountType === 'owner' || user.role === 'Super Admin';
  return jwt.sign(
    {
      sub: user._id.toString(),
      email: user.email,
      role: user.role,
      accountType: user.accountType || (isSuperAdmin ? 'owner' : 'member'),
      isSuperAdmin,
      permissions: user.permissions || {},
      branch: user.branch || '',
      subscriptionPlan: user.subscriptionPlan || '',
      businessId: user.businessId?.toString(),
      category: user.category || 'retail',
      retailSubcategory: user.retailSubcategory || '',
    },
    env.jwtSecret,
    { expiresIn: env.jwtExpiresIn },
  );
}

export function toSafeUser(user) {
  const isSuperAdmin = user.accountType === 'owner' || user.role === 'Super Admin';
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
    accountType: user.accountType || (isSuperAdmin ? 'owner' : 'member'),
    isPlatformOwner: Boolean(user.isPlatformOwner),
    isSuperAdmin,
    permissions: user.permissions || { modules: [], actions: {} },
    branch: user.branch,
    phone: user.phone,
    businessId: user.businessId,
    businessName: user.businessName,
    category: user.category || 'retail',
    retailSubcategory: user.retailSubcategory || '',
    subscriptionPlan: user.subscriptionPlan || '',
    subscriptionAmount: user.subscriptionAmount || 0,
    subscriptionStatus: user.subscriptionStatus || '',
    subscriptionExpiresAt: user.subscriptionExpiresAt || null,
    trialStartedAt: user.trialStartedAt || null,
    trialEndsAt: user.trialEndsAt || null,
    trialExpired: isTrialExpired(user),
    onboardingCompleted: Boolean(user.onboardingCompleted),
    emailVerified: Boolean(user.emailVerified || user.googleId),
    needsEmailVerification: Boolean(!user.googleId && !user.emailVerified),
    needsOnboarding: Boolean(!user.onboardingCompleted && !user.businessId && !user.isPlatformOwner),
    status: user.status,
    lastLogin: user.lastLogin,
    authProvider: user.authProvider || (user.googleId ? 'google' : 'email'),
    avatarUrl: user.googleProfile?.picture || '',
  };
}

// Creates a brand-new business owned by the first user who signs up for it.
async function createBusinessForNewUser(businessName, fallbackName, category = 'retail', retailSubcategory = '') {
  const business = await Business.create({
    name: businessName?.trim() || `${fallbackName}'s Business`,
    category,
    retailSubcategory: category === 'retail' ? retailSubcategory : '',
  });
  return business;
}

function normalizeEmail(email = '') {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function validatePassword(password) {
  if (!password) throw httpError(400, 'Password is required');
  if (password.length < 8) throw httpError(400, 'Password must be at least 8 characters');
  if (!/[A-Za-z]/.test(password) || !/[0-9]/.test(password)) {
    throw httpError(400, 'Password must include at least one letter and one number');
  }
}

async function ensureEmailAvailable(email, excludeUserId = null) {
  // Old Google sign-ins created users before business registration. Let those
  // active placeholders finish the current, email-verified registration flow.
  const query = { email, $or: [
    { onboardingCompleted: true }, { businessId: { $ne: null } },
    { googleId: { $in: ['', null] } }, { status: { $ne: 'Active' } },
    { isPlatformOwner: true },
  ] };
  if (excludeUserId) query._id = { $ne: excludeUserId };
  const existing = await AppUser.exists(query);
  if (existing) throw httpError(409, 'Email already registered. Use another email address.');
}

function buildGoogleProfile(payload, email) {
  return {
    subject: payload.sub || '', email, emailVerified: Boolean(payload.email_verified), name: payload.name || '',
    givenName: payload.given_name || '', familyName: payload.family_name || '', picture: payload.picture || '',
    locale: payload.locale || '', hostedDomain: payload.hd || '', issuer: payload.iss || '',
    audience: payload.aud || '', authorizedParty: payload.azp || '', lastSyncedAt: new Date(),
  };
}

async function verifyGoogleCredential(credential) {
  if (!googleClient) throw httpError(503, 'Google sign-in is not configured on the server');
  if (!credential || typeof credential !== 'string') throw httpError(400, 'Google credential is required');
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: credential, audience: env.googleClientId });
    const payload = ticket.getPayload();
    const email = normalizeEmail(payload?.email);
    if (!email || !payload?.sub || !payload.email_verified) throw httpError(401, 'Google account email is not verified');
    return { email, payload };
  } catch (error) {
    if (error.statusCode) throw error;
    throw httpError(401, 'Invalid or expired Google credential');
  }
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

async function ensureRetailSubcategory(userDoc) {
  if (!userDoc || userDoc.category !== 'retail' || userDoc.retailSubcategory) return;
  const [business, settings] = await Promise.all([
    userDoc.businessId ? Business.findById(userDoc.businessId, { retailSubcategory: 1 }).lean() : null,
    BusinessSettings.findOne({ userId: userDoc._id }, { retailSubcategory: 1 }).lean(),
  ]);
  const retailSubcategory = business?.retailSubcategory || settings?.retailSubcategory || LEGACY_RETAIL_SUBCATEGORY;
  userDoc.retailSubcategory = retailSubcategory;
  await Promise.all([
    userDoc.save(),
    userDoc.businessId
      ? Business.updateOne({ _id: userDoc.businessId }, { $set: { retailSubcategory } })
      : Promise.resolve(),
    BusinessSettings.updateOne({ userId: userDoc._id }, { $set: { retailSubcategory } }, { upsert: true }),
  ]);
}

async function ensureSafeUserWithRetailSubcategory(userDoc) {
  await ensureRetailSubcategory(userDoc);
  return toSafeUser(userDoc.toObject ? userDoc.toObject() : userDoc);
}

function createResetOtp() {
  return String(randomInt(100000, 1000000));
}

function getResetOtpEmailHtml({ name, otp }) {
  return buildBrandedEmail({
    title: 'Reset your GoBooks password',
    preheader: `Your GoBooks password reset OTP expires in ${RESET_OTP_EXPIRES_MINUTES} minutes.`,
    greeting: `Hi ${name || 'there'},`,
    intro: `Use this OTP on the GoBooks reset password page. It expires in ${RESET_OTP_EXPIRES_MINUTES} minutes.`,
    otp,
    notice: 'If you did not request this, you can ignore this email. Your password will not change.',
    footerText: 'For your security, GoBooks never asks you to share your password or OTP with anyone.',
    badge: 'Secure account recovery',
  });
}
function getEmailVerificationHtml({ name, otp }) {
  return buildBrandedEmail({
    title: 'Verify your GoBooks email',
    preheader: `Your GoBooks email verification OTP expires in ${EMAIL_VERIFY_OTP_EXPIRES_MINUTES} minutes.`,
    greeting: `Hi ${name || 'there'},`,
    intro: `Use this OTP to verify your email address. It expires in ${EMAIL_VERIFY_OTP_EXPIRES_MINUTES} minutes.`,
    otp,
    notice: 'If you did not create a GoBooks account, you can ignore this email.',
    footerText: 'This verification keeps your GoBooks account and business data protected.',
    badge: 'Email verification',
  });
}

function getLoginOtpEmailHtml({ name, otp }) {
  return buildBrandedEmail({
    title: 'Your GoBooks email login OTP',
    preheader: `Your GoBooks email login OTP expires in ${LOGIN_OTP_EXPIRES_MINUTES} minutes.`,
    greeting: `Hi ${name || 'there'},`,
    intro: `Use this OTP to sign in to GoBooks. It expires in ${LOGIN_OTP_EXPIRES_MINUTES} minutes.`,
    otp,
    notice: 'If you did not request this login, you can safely ignore this email.',
    footerText: 'GoBooks uses OTP verification to protect every email sign-in.',
    badge: 'Protected login',
  });
}
function getSignupOtpEmailHtml({ name, otp }) {
  return buildBrandedEmail({
    title: 'Verify your GoBooks signup',
    preheader: `Your GoBooks signup OTP expires in ${SIGNUP_OTP_EXPIRES_MINUTES} minutes.`,
    greeting: `Hi ${name || 'there'},`,
    intro: `Use this OTP to finish creating your GoBooks account. It expires in ${SIGNUP_OTP_EXPIRES_MINUTES} minutes.`,
    otp,
    notice: 'Your account will be created only after this OTP is verified.',
    footerText: 'Welcome to GoBooks. We are keeping your signup flow secure from the first step.',
    badge: 'Secure signup',
  });
}
async function sendEmailVerificationOtp(user) {
  const otp = createResetOtp();
  user.emailVerificationOtpHash = await bcrypt.hash(otp, SALT_ROUNDS);
  user.emailVerificationOtpExpiresAt = new Date(Date.now() + EMAIL_VERIFY_OTP_EXPIRES_MINUTES * 60 * 1000);
  user.emailVerificationOtpAttempts = 0;
  await user.save();

  await sendMail({
    to: user.email,
    subject: 'Verify your GoBooks email',
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
  const retailSubcategory = String(req.body.retailSubcategory ?? '').trim();
  const phone = String(req.body.phone ?? '').trim();
  const gstin = String(req.body.gstin ?? '').trim().toUpperCase();
  const bankName = String(req.body.bankName ?? '').trim();
  const accountHolderName = String(req.body.accountHolderName ?? '').trim();
  const accountNumber = String(req.body.accountNumber ?? '').replace(/\D/g, '');
  const ifscCode = String(req.body.ifscCode ?? '').trim().toUpperCase();
  const bankBranch = String(req.body.bankBranch ?? '').trim();
  const accountType = String(req.body.accountType ?? 'Savings').trim() || 'Savings';
  const subscriptionPlan = String(req.body.subscriptionPlan ?? '').trim();

  return {
    name,
    email,
    password,
    businessName,
    category,
    retailSubcategory: category === 'retail' ? retailSubcategory : '',
    phone,
    gstin,
    bankName,
    accountHolderName,
    accountNumber,
    ifscCode,
    bankBranch,
    accountType,
    subscriptionPlan,
    subscriptionAmount: 0,
  };
}

async function validateSignupPayload(payload) {
  if (!payload.name || !payload.email || !payload.password) throw httpError(400, 'Name, email and password are required');
  validatePassword(payload.password);
  if (!payload.businessName || payload.businessName.length < 2) throw httpError(400, 'Business name is required');
  if (!payload.phone) throw httpError(400, 'Phone number is required');
  if (!payload.accountHolderName) throw httpError(400, 'Account holder name is required');
  if (!payload.bankName) throw httpError(400, 'Bank name is required');
  if (!/^\d{6,18}$/.test(payload.accountNumber)) throw httpError(400, 'Enter a valid bank account number');
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(payload.ifscCode)) throw httpError(400, 'Enter a valid IFSC code');
  if (!CATEGORIES.includes(payload.category)) throw httpError(400, 'Select a valid business category');
  if (payload.category === 'retail' && !RETAIL_SUBCATEGORIES.includes(payload.retailSubcategory)) {
    throw httpError(400, 'Select a valid retail subcategory');
  }
  if (payload.subscriptionPlan) {
    if (!SUBSCRIPTION_PLANS.includes(payload.subscriptionPlan)) throw httpError(400, 'Select a valid plan');
    const plan = await getActivePlan(payload.category, payload.subscriptionPlan);
    if (!plan) throw httpError(400, 'The selected plan is not available');
    payload.subscriptionAmount = plan.amount;
  }

  await ensureEmailAvailable(payload.email);
}

// POST /api/auth/register
export async function startRegistration(req, res, next) {
  try {
    const payload = getSignupPayload(req);
    await validateSignupPayload(payload);

    let emailVerified = false;
    if (req.body.signupToken) {
      if (typeof req.body.signupToken !== 'string' || !/^[a-f0-9]{64}$/.test(req.body.signupToken)) throw httpError(400, 'Invalid signup verification');
      emailVerified = Boolean(await PendingEmailLogin.exists({ email: payload.email, signupTokenHash: hashSignupToken(req.body.signupToken), signupExpiresAt: { $gt: new Date() } }));
      if (!emailVerified) throw httpError(400, 'Email verification expired. Return to login and request a new OTP.');
    }
    const { otp, otpHash, otpExpiresAt } = await createPendingSignupOtp();
    const pending = await PendingSignup.findOneAndUpdate(
      { email: payload.email },
      {
        $set: {
          ...payload,
          googleId: '',
          authProvider: 'email',
          password: await bcrypt.hash(payload.password, SALT_ROUNDS),
          otpHash,
          otpExpiresAt,
          otpAttempts: 0,
          otpVerifiedAt: emailVerified ? new Date() : null,
          razorpayOrderId: '',
        },
        $unset: { googleProfile: 1 },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).select('+password');
    if (emailVerified) {
      const user = await completeFreeSignup(pending);
      return res.status(201).json({ token: signToken(user), user: toSafeUser(user), message: 'Account created. Your 15-day free trial has started.' });
    }

    await sendMail({
      to: payload.email,
      subject: 'Your GoBooks signup OTP',
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

    pending.otpAttempts = 0;
    pending.otpVerifiedAt = new Date();

    const user = await completeFreeSignup(pending);
    res.status(201).json({ token: signToken(user), user: toSafeUser(user), message: 'Account created. Your 15-day free trial has started.' });
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
    await ensureRetailSubcategory(user);

    const token = signToken(user);
    res.json({ token, user: toSafeUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function googleLogin(req, res, next) {
  try {
    const { email, payload } = await verifyGoogleCredential(req.body.credential);
    const googleProfile = buildGoogleProfile(payload, email);
    const [byEmail, byGoogleId] = await Promise.all([AppUser.findOne({ email }), AppUser.findOne({ googleId: payload.sub })]);
    if (byEmail && byGoogleId && byEmail._id.toString() !== byGoogleId._id.toString()) throw httpError(409, 'This Google account is already linked to another GoBook user');
    const user = byGoogleId || byEmail;
    if (user && user.status !== 'Active') throw httpError(403, 'Account is not active');
    if (user && user.googleId && user.googleId !== payload.sub) throw httpError(409, 'This email is already linked to a different Google account');
    if (!user || (!user.businessId && !user.onboardingCompleted && !user.isPlatformOwner)) {
      return res.json({ registrationRequired: true, email, message: 'Create your business account to continue.' });
    } else {
      user.googleId = payload.sub;
      user.authProvider = 'google';
      user.emailVerified = true;
      user.googleProfile = googleProfile;
      user.lastLogin = new Date().toISOString();
      await user.save();
      if (user.onboardingCompleted) await ensureRetailSubcategory(user);
    }
    res.json({ token: signToken(user), user: toSafeUser(user), message: 'Signed in with Google' });
  } catch (err) {
    next(err);
  }
}

// Email ownership is verified before looking up an account or offering signup.
export async function startEmailOtpLogin(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw httpError(400, 'Enter a valid email address');
    }
    const now = new Date();
    await PendingEmailLogin.updateOne({ email }, {
      $setOnInsert: { email, cleanupAt: new Date(Date.now() + 3600000) },
    }, { upsert: true });
    // Claim the send slot atomically so concurrent resends cannot bypass cooldown.
    const pending = await PendingEmailLogin.findOneAndUpdate({
      email,
      $and: [
        { $or: [{ sentAt: { $exists: false } }, { sentAt: { $lte: new Date(Date.now() - 60000) } }] },
        { $or: [{ windowStartedAt: { $exists: false } }, { windowStartedAt: { $lte: new Date(Date.now() - 3600000) } }, { sendCount: { $lt: 5 } }] },
      ],
    }, { $set: { sentAt: now } }, { new: true });
    if (!pending) throw httpError(429, 'Please wait before requesting another OTP. Maximum 5 emails per hour.');
    const otp = createResetOtp();
    const otpHash = await bcrypt.hash(otp, SALT_ROUNDS);
    const resetWindow = !pending.windowStartedAt || pending.windowStartedAt.getTime() <= Date.now() - 3600000;
    await PendingEmailLogin.updateOne({ _id: pending._id, sentAt: now }, {
      $set: {
        otpHash, otpExpiresAt: new Date(Date.now() + LOGIN_OTP_EXPIRES_MINUTES * 60000),
        otpAttempts: 0, signupTokenHash: '', signupExpiresAt: null,
        windowStartedAt: resetWindow ? now : pending.windowStartedAt,
        sendCount: resetWindow ? 1 : pending.sendCount + 1,
        cleanupAt: new Date(Date.now() + 3600000),
      },
    });
    try {
      await sendMail({ to: email, subject: 'Your GoBooks login OTP', html: getLoginOtpEmailHtml({ otp }) });
    } catch {
      await PendingEmailLogin.updateOne({ _id: pending._id, otpHash }, { $unset: { otpHash: 1, otpExpiresAt: 1 } });
      throw httpError(503, 'Unable to send OTP right now. Please try again in a minute.');
    }
    res.status(202).json({ email, message: 'OTP sent to your email', expiresInMinutes: LOGIN_OTP_EXPIRES_MINUTES, resendAfterSeconds: 60 });
  } catch (err) {
    if (err.code === 11000) return next(httpError(429, 'Please wait before requesting another OTP.'));
    next(err);
  }
}

export async function verifyEmailOtpLogin(req, res, next) {
  try {
    const email = normalizeEmail(req.body.email);
    const otp = String(req.body.otp || '').trim();
    if (!email || !/^\d{6}$/.test(otp)) throw httpError(400, 'Enter your email and a 6-digit OTP');
    // Reserve an attempt before comparison; parallel guesses still count.
    const pending = await PendingEmailLogin.findOneAndUpdate({
      email, otpHash: { $exists: true, $ne: '' }, otpExpiresAt: { $gt: new Date() },
      otpAttempts: { $lt: LOGIN_OTP_MAX_ATTEMPTS },
    }, { $inc: { otpAttempts: 1 } }, { new: true }).select('+otpHash');
    if (!pending) throw httpError(400, 'Invalid, expired or exhausted OTP. Request a new OTP.');
    if (!(await bcrypt.compare(otp, pending.otpHash))) throw httpError(400, 'Invalid or expired OTP');
    const signupToken = randomBytes(32).toString('hex');
    const consumed = await PendingEmailLogin.updateOne({
      _id: pending._id, otpHash: pending.otpHash, otpExpiresAt: { $gt: new Date() },
    }, {
      $unset: { otpHash: 1, otpExpiresAt: 1 },
      $set: { signupTokenHash: hashSignupToken(signupToken), signupExpiresAt: new Date(Date.now() + 1800000) },
    });
    if (!consumed.modifiedCount) throw httpError(400, 'OTP already used. Request a new OTP.');
    const user = await AppUser.findOne({ email });
    if (!user) return res.json({ registrationRequired: true, email, signupToken, message: 'Email verified. Create your account to continue.' });
    if (user.status !== 'Active') throw httpError(403, 'Account is not active');
    user.emailVerified = true;
    user.lastLogin = new Date().toISOString();
    await user.save();
    if (user.onboardingCompleted) await ensureRetailSubcategory(user);
    res.json({ token: signToken(user), user: toSafeUser(user) });
  } catch (err) {
    next(err);
  }
}

function hashSignupToken(token) {
  return createHash('sha256').update(token).digest('hex');
}

// POST /api/auth/complete-onboarding
export async function completeOnboarding(req, res, next) {
  try {
    const user = await AppUser.findById(req.user.id);
    if (!user) return next(httpError(404, 'User not found'));
    if (user.onboardingCompleted || user.businessId) return next(httpError(409, 'Onboarding is already completed'));
    const businessName = String(req.body.businessName ?? '').trim();
    const category = String(req.body.category ?? '').trim();
    const retailSubcategory = category === 'retail' ? String(req.body.retailSubcategory ?? '').trim() : '';
    const phone = String(req.body.phone ?? '').trim();
    const gstin = String(req.body.gstin ?? '').trim().toUpperCase();
    const password = String(req.body.password ?? '');
    const bankName = String(req.body.bankName ?? '').trim();
    const accountHolderName = String(req.body.accountHolderName ?? '').trim();
    const accountNumber = String(req.body.accountNumber ?? '').replace(/\D/g, '');
    const ifscCode = String(req.body.ifscCode ?? '').trim().toUpperCase();
    const bankBranch = String(req.body.bankBranch ?? '').trim();
    const accountType = String(req.body.accountType ?? 'Savings').trim() || 'Savings';

    if (!businessName || businessName.length < 2) return next(httpError(400, 'Business name is required'));
    if (!CATEGORIES.includes(category)) return next(httpError(400, 'Select a valid business category'));
    if (category === 'retail' && !RETAIL_SUBCATEGORIES.includes(retailSubcategory)) return next(httpError(400, 'Select a valid retail subcategory'));
    if (!phone) return next(httpError(400, 'Phone number is required'));
    if (!accountHolderName) return next(httpError(400, 'Account holder name is required'));
    if (!bankName) return next(httpError(400, 'Bank name is required'));
    if (!/^\d{6,18}$/.test(accountNumber)) return next(httpError(400, 'Enter a valid bank account number'));
    if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifscCode)) return next(httpError(400, 'Enter a valid IFSC code'));
    validatePassword(password);

    const { otpHash, otpExpiresAt } = await createPendingSignupOtp();
    const pending = await PendingSignup.findOneAndUpdate(
      { email: user.email },
      {
        $set: {
          name: user.name, email: user.email,
          googleId: user.googleId, authProvider: user.authProvider || 'email', googleProfile: user.googleProfile,
          password: await bcrypt.hash(password, SALT_ROUNDS),
          businessName, category, retailSubcategory, phone, gstin,
          bankName, accountHolderName, accountNumber, ifscCode, bankBranch, accountType,
          subscriptionPlan: '',
          subscriptionAmount: 0,
          otpHash, otpExpiresAt, otpAttempts: 0,
          otpVerifiedAt: new Date(), razorpayOrderId: '',
        },
      },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).select('+password');
    const finalUser = await completeFreeSignup(pending);
    res.status(201).json({ token: signToken(finalUser), user: toSafeUser(finalUser), message: 'Account created. Your 15-day free trial has started.' });
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
      subject: 'Your GoBooks password reset OTP',
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
    const userDoc = await AppUser.findById(req.user.id);
    if (!userDoc) return next(httpError(404, 'User not found'));
    res.json(await ensureSafeUserWithRetailSubcategory(userDoc));
  } catch (err) {
    next(err);
  }
}

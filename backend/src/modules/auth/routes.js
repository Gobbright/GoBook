import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.js';
import { emailOtpRateLimit } from '../../middleware/emailOtpRateLimit.js';
import { completeOnboarding, forgotPassword, getMe, googleLogin, login, register, resendEmailVerificationOtp, resetPassword, startEmailOtpLogin, verifyEmailOtp, verifyEmailOtpLogin, verifyRegistrationOtp } from './authController.js';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/register/verify-otp', verifyRegistrationOtp);
authRouter.post('/login', login);
authRouter.post('/google', googleLogin);
authRouter.post('/email-otp/start', emailOtpRateLimit, startEmailOtpLogin);
authRouter.post('/email-otp/verify', verifyEmailOtpLogin);
authRouter.post('/complete-onboarding', requireAuth, completeOnboarding);
authRouter.post('/resend-email-otp', requireAuth, resendEmailVerificationOtp);
authRouter.post('/verify-email', requireAuth, verifyEmailOtp);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);
authRouter.get('/me', requireAuth, getMe);


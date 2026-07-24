import { Router } from 'express';

import { requireAuth } from '../../middleware/auth.js';
import { completeGoogleOnboarding, forgotPassword, getMe, googleLogin, login, register, resendEmailVerificationOtp, resetPassword, startGoogleOtpLogin, verifyEmailOtp, verifyGoogleOtpLogin, verifyRegistrationOtp } from './authController.js';

export const authRouter = Router();

authRouter.post('/register', register);
authRouter.post('/register/verify-otp', verifyRegistrationOtp);
authRouter.post('/login', login);
authRouter.post('/google', googleLogin);
authRouter.post('/google-otp/start', startGoogleOtpLogin);
authRouter.post('/google-otp/verify', verifyGoogleOtpLogin);
authRouter.post('/complete-google-onboarding', requireAuth, completeGoogleOnboarding);
authRouter.post('/resend-email-otp', requireAuth, resendEmailVerificationOtp);
authRouter.post('/verify-email', requireAuth, verifyEmailOtp);
authRouter.post('/forgot-password', forgotPassword);
authRouter.post('/reset-password', resetPassword);
authRouter.get('/me', requireAuth, getMe);


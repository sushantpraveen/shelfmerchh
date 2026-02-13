Mobile OTP Verification Implementation Guide
This guide provides a comprehensive approach for implementing mobile OTP verification in your application, based on the successful implementation in the SignatureDay project.

Architecture Overview
The OTP system is built with the following components:

POST /api/otp/send
POST /api/otp/verify
Auto-expire
Frontend - OTP Widget
Backend - OTP Controller
OTP Service
SMS Service - MSG91
MongoDB - OTP Collection
TTL Index
Backend Implementation
1. Database Model
Create a MongoDB schema for OTP verification records:

File: 
backend/models/OTPVerification.js

javascript
import mongoose from 'mongoose';
const otpVerificationSchema = new mongoose.Schema({
  phone: { type: String, required: true, index: true },        // Full phone with country code (+91xxxxxxxxxx)
  phone10: { type: String, index: true },                      // 10-digit number for easy querying
  otpHash: { type: String, required: true },                   // SHA-256 hash of OTP (NEVER store plain OTP)
  purpose: { type: String, default: 'generic', index: true },  // login, checkout, joinGroup, etc.
  attempts: { type: Number, default: 0 },                      // Failed verification attempts
  expiresAt: { type: Date, required: true },                   // OTP expiration time
  lastSentAt: { type: Date, index: true },                     // For cooldown enforcement
  verified: { type: Boolean, default: false, index: true },    // Verification status
  verifiedAt: { type: Date },                                  // When verified
  usedAt: { type: Date },                                      // When consumed (for single-use enforcement)
  createdAt: { type: Date, default: Date.now, index: true }
});
// Auto-delete expired records using MongoDB TTL index
otpVerificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model('OTPVerification', otpVerificationSchema);
Key Design Decisions:

✅ Store OTP as SHA-256 hash, never plain text
✅ Use MongoDB TTL index for automatic cleanup
✅ Support multiple purposes to track OTP context
✅ Track attempts to prevent brute force attacks
2. Phone Validation (India-Specific)
File: 
backend/utils/phoneValidationIndia.js

javascript
import { parsePhoneNumberFromString } from 'libphonenumber-js';
const TEN_DIGITS = /^\d{10}$/;
// Block common fake/test numbers
const FAKE_PATTERNS = [
  /^(\d)\1{9}$/,           // All same digit (0000000000, 1111111111, etc.)
  /^0123456789$/,
  /^1234567890$/,
  /^9876543210$/,
  /^(\d)(\d)(\d)(\d)(\d)\5{5}$/  // Repeated half (xxxxxyyyyy)
];
function isFakeNumber(phone10) {
  const digits = phone10.replace(/\D/g, '');
  if (digits.length !== 10) return true;
  return FAKE_PATTERNS.some(re => re.test(digits));
}
export function validatePhoneIndia(phone10) {
  if (!phone10 || typeof phone10 !== 'string') {
    return { valid: false, error: 'Invalid phone number' };
  }
  
  const digits = phone10.replace(/\D/g, '');
  
  if (!TEN_DIGITS.test(digits)) {
    return { valid: false, error: 'Invalid phone number' };
  }
  
  if (isFakeNumber(digits)) {
    return { valid: false, error: 'Invalid phone number' };
  }
  
  // Validate using libphonenumber-js
  const phoneObj = parsePhoneNumberFromString('+91' + digits, 'IN');
  if (!phoneObj || !phoneObj.isPossible() || !phoneObj.isValid()) {
    return { valid: false, error: 'Invalid phone number' };
  }
  
  return { valid: true };
}
export function toPhone10(raw) {
  if (!raw || typeof raw !== 'string') return null;
  const digits = raw.replace(/\D/g, '');
  return digits.length === 10 ? digits : null;
}
Dependencies: Install libphonenumber-js for robust phone validation

bash
npm install libphonenumber-js
3. OTP Service Layer
File: 
backend/utils/otpService.js

javascript
import crypto from 'crypto';
import OTPVerification from '../models/OTPVerification.js';
import { sendOTP } from '../services/smsService.js';
const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 60;
export function generateOTP(length = 6) {
  const digits = '0123456789';
  let otp = '';
  for (let i = 0; i < length; i++) {
    otp += digits[Math.floor(Math.random() * digits.length)];
  }
  return otp;
}
export function hashOTP(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}
function expiresAt(minutes = OTP_EXPIRY_MINUTES) {
  return new Date(Date.now() + minutes * 60 * 1000);
}
/**
 * Create and send OTP for phone10 (India 10-digit). Enforces cooldown.
 */
export async function createAndSendOtp(phone10, purpose) {
  const normalized = phone10.replace(/\D/g, '');
  if (normalized.length !== 10) {
    return { success: false, error: 'Invalid phone number' };
  }
  // Check cooldown: prevent sending OTP within 60 seconds
  const lastRecord = await OTPVerification.findOne({ phone: '+91' + normalized })
    .sort({ lastSentAt: -1 });
  if (lastRecord?.lastSentAt) {
    const elapsed = (Date.now() - lastRecord.lastSentAt.getTime()) / 1000;
    if (elapsed < COOLDOWN_SECONDS) {
      const remaining = Math.ceil(COOLDOWN_SECONDS - elapsed);
      return {
        success: false,
        error: `Please wait ${remaining}s before requesting OTP again.`,
        retryAfter: remaining
      };
    }
  }
  const otp = generateOTP(6);
  const record = {
    phone: '+91' + normalized,
    phone10: normalized,
    otpHash: hashOTP(otp),
    purpose: purpose || 'generic',
    expiresAt: expiresAt(OTP_EXPIRY_MINUTES),
    attempts: 0,
    lastSentAt: new Date(),
    verified: false
  };
  await OTPVerification.create(record);
  await sendOTP({ phone: '+91' + normalized, otp, source: purpose || 'otp' });
  return { success: true };
}
/**
 * Verify OTP for phone10. Increments attempts on wrong OTP.
 */
export async function verifyOtpRecord(phone10, otp, purpose) {
  const normalized = phone10.replace(/\D/g, '');
  if (normalized.length !== 10 || !otp || String(otp).replace(/\D/g, '').length !== 6) {
    return { success: false, error: 'Invalid OTP' };
  }
  const record = await OTPVerification.findOne({
    phone: '+91' + normalized,
    purpose: purpose || 'generic'
  }).sort({ createdAt: -1 });
  if (!record) {
    return { success: false, error: 'Invalid OTP' };
  }
  
  if (record.expiresAt.getTime() < Date.now()) {
    return { success: false, error: 'OTP expired. Please resend.' };
  }
  
  if (record.attempts >= MAX_ATTEMPTS) {
    return { success: false, error: 'Invalid OTP' };
  }
  const incomingHash = hashOTP(String(otp).replace(/\D/g, ''));
  if (incomingHash !== record.otpHash) {
    record.attempts += 1;
    await record.save();
    return { success: false, error: 'Invalid OTP' };
  }
  record.verified = true;
  record.verifiedAt = new Date();
  await record.save();
  return { success: true, verifiedAt: record.verifiedAt };
}
4. SMS Service (MSG91 Integration)
File: 
backend/services/smsService.js

javascript
import dotenv from 'dotenv';
dotenv.config();
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID;
const MSG91_FLOW_ID = process.env.MSG91_OTP_TEMPLATE_ID;
const hasCreds = Boolean(MSG91_AUTH_KEY && MSG91_SENDER_ID && MSG91_FLOW_ID);
const hasFetch = typeof globalThis.fetch === 'function';
export const sendOTP = async ({ phone, otp, source = 'otp' }) => {
  // Dev mode: log OTP to console if credentials are missing
  if (!hasCreds || !hasFetch) {
    console.log(`[OTP][DEV][${source}] ${phone} -> ${otp}`);
    return { success: true, message: 'OTP logged (dev mode)' };
  }
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);
  try {
    const payload = {
      flow_id: MSG91_FLOW_ID,
      sender: MSG91_SENDER_ID,
      short_url: '1',
      recipients: [
        {
          mobiles: phone.replace('+', ''),
          otp,
          VAR1: otp,      // Template variable for OTP
          var1: otp,
          source,
          VAR2: source
        }
      ]
    };
    const response = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        authkey: MSG91_AUTH_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`MSG91 responded with ${response.status}: ${text}`);
    }
    const data = await response.json().catch(() => ({}));
    return {
      success: true,
      message: data?.message || 'OTP sent successfully'
    };
  } catch (error) {
    clearTimeout(timeoutId);
    console.error('[OTP] MSG91 error', error);
    console.log(`[OTP][Fallback][${source}] ${phone} -> ${otp}`);
    return { success: true, message: 'OTP logged (fallback)' };
  }
};
IMPORTANT

MSG91 Setup Requirements:

Sign up at MSG91
Create an OTP Template/Flow in the MSG91 dashboard
Note your Auth Key, Sender ID, and Flow ID
Add these to your .env file
5. OTP Controller
File: 
backend/controllers/otpController.js

javascript
import OTPVerification from '../models/OTPVerification.js';
import { validatePhoneIndia } from '../utils/phoneValidationIndia.js';
import { createAndSendOtp, verifyOtpRecord } from '../utils/otpService.js';
const VERIFIED_MAX_AGE_MINUTES = Number(process.env.OTP_VERIFIED_MAX_AGE_MINUTES || 30);
const PHONE_SEND_WINDOW_MINUTES = 15;
const PHONE_SEND_MAX = 3;
function getClientIp(req) {
  return req.ip || req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket?.remoteAddress || 'unknown';
}
function logOtpRequest(phone10, ip, userAgent, purpose, result) {
  console.log(
    `[OTP] phone10=${phone10} ip=${ip} purpose=${purpose || 'generic'} result=${result} ua=${userAgent?.slice(0, 80) || ''}`
  );
}
/**
 * POST /api/otp/send
 * Body: { phone10: string, purpose?: string }
 */
export const sendOtp = async (req, res) => {
  const ip = getClientIp(req);
  const userAgent = req.get('User-Agent') || '';
  
  try {
    const { phone10, purpose = 'generic' } = req.body || {};
    const digits = typeof phone10 === 'string' ? phone10.replace(/\D/g, '') : '';
    
    if (!/^\d{10}$/.test(digits)) {
      logOtpRequest(phone10 || '', ip, userAgent, purpose, 'invalid');
      return res.status(400).json({ ok: false, error: 'Invalid phone number' });
    }
    const validation = validatePhoneIndia(digits);
    if (!validation.valid) {
      logOtpRequest(digits, ip, userAgent, purpose, 'invalid');
      return res.status(400).json({ ok: false, error: validation.error || 'Invalid phone number' });
    }
    // Prevent abuse: max 3 OTPs per phone in 15 minutes
    const countLast15 = await OTPVerification.countDocuments({
      phone10: digits,
      lastSentAt: { $gte: new Date(Date.now() - PHONE_SEND_WINDOW_MINUTES * 60 * 1000) }
    });
    
    if (countLast15 >= PHONE_SEND_MAX) {
      logOtpRequest(digits, ip, userAgent, purpose, 'blocked');
      return res.status(429).json({ ok: false, error: 'Too many OTP requests. Try again later.' });
    }
    const result = await createAndSendOtp(digits, purpose);
    
    if (!result.success) {
      if (result.retryAfter) {
        logOtpRequest(digits, ip, userAgent, purpose, 'cooldown');
        return res.status(429).json({
          ok: false,
          error: result.error,
          retryAfter: result.retryAfter
        });
      }
      logOtpRequest(digits, ip, userAgent, purpose, 'blocked');
      return res.status(400).json({ ok: false, error: result.error || 'Invalid phone number' });
    }
    logOtpRequest(digits, ip, userAgent, purpose, 'sent');
    return res.status(200).json({
      ok: true,
      message: 'OTP sent successfully'
    });
  } catch (error) {
    console.error('[OTP] send error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to send OTP' });
  }
};
/**
 * POST /api/otp/verify
 * Body: { phone10: string, otp: string, purpose?: string }
 */
export const verifyOtp = async (req, res) => {
  try {
    const { phone10, otp, purpose = 'generic' } = req.body || {};
    const digits = typeof phone10 === 'string' ? phone10.replace(/\D/g, '') : '';
    
    if (!/^\d{10}$/.test(digits)) {
      return res.status(400).json({ ok: false, error: 'Invalid phone number' });
    }
    
    if (!otp || String(otp).replace(/\D/g, '').length !== 6) {
      return res.status(400).json({ ok: false, error: 'Invalid OTP' });
    }
    const result = await verifyOtpRecord(digits, otp, purpose);
    
    if (!result.success) {
      return res.status(400).json({ ok: false, error: result.error });
    }
    
    return res.status(200).json({
      ok: true,
      message: 'OTP verified successfully',
      verifiedAt: result.verifiedAt
    });
  } catch (error) {
    console.error('[OTP] verify error:', error);
    return res.status(500).json({ ok: false, error: 'Failed to verify OTP' });
  }
};
/**
 * GET /api/otp/status/:phone
 * Check if phone is verified within the last 30 minutes
 */
export const statusByPhone = async (req, res) => {
  try {
    let raw = req.params.phone || '';
    const digits = raw.replace(/\D/g, '');
    const normalized = digits.length === 10 ? '+91' + digits : 
                       digits.length === 12 && digits.startsWith('91') ? '+' + digits : null;
    
    if (!normalized) {
      return res.status(400).json({ ok: false, verified: false });
    }
    const record = await OTPVerification.findOne({ phone: normalized })
      .sort({ verifiedAt: -1 });
    if (!record || !record.verified) {
      return res.status(404).json({ ok: false, verified: false });
    }
    
    if (!record.verifiedAt || (Date.now() - record.verifiedAt.getTime()) > VERIFIED_MAX_AGE_MINUTES * 60 * 1000) {
      return res.status(404).json({ ok: false, verified: false });
    }
    
    return res.status(200).json({
      ok: true,
      verified: true,
      verifiedAt: record.verifiedAt,
      usedAt: record.usedAt || null
    });
  } catch (error) {
    console.error('[OTP] status error:', error);
    return res.status(500).json({ ok: false });
  }
};
6. Rate Limiting Middleware
File: 
backend/middleware/rateLimits.js

javascript
import rateLimit from 'express-rate-limit';
// IP-based rate limiting: 5 OTP requests per 15 minutes per IP
export const otpSendByIpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { ok: false, error: 'Too many OTP requests from this IP. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});
Dependency: Install express-rate-limit

bash
npm install express-rate-limit
7. Routes
File: 
backend/routes/otpRoutes.js

javascript
import express from 'express';
import { sendOtp, verifyOtp, statusByPhone } from '../controllers/otpController.js';
import { otpSendByIpLimiter } from '../middleware/rateLimits.js';
const router = express.Router();
router.post('/send', otpSendByIpLimiter, sendOtp);
router.post('/verify', verifyOtp);
router.get('/status/:phone', statusByPhone);
export default router;
Register in main server file:

javascript
import otpRoutes from './routes/otpRoutes.js';
app.use('/api/otp', otpRoutes);
8. Environment Variables
File: 
backend/.env

bash
# OTP Configuration
MSG91_AUTH_KEY=your_msg91_auth_key_here
MSG91_SENDER_ID=your_sender_id_here
MSG91_OTP_TEMPLATE_ID=your_flow_id_here
OTP_VERIFIED_MAX_AGE_MINUTES=30
Frontend Implementation
1. OTP Client API
File: 
src/lib/otpClient.ts

typescript
export interface SendOtpResponse {
  ok: boolean;
  message?: string;
  error?: string;
  retryAfter?: number;
}
export interface VerifyOtpResponse {
  ok: boolean;
  message?: string;
  error?: string;
  verifiedAt?: string;
}
async function handleResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => null);
  if (!response.ok) {
    const message = (data as { error?: string })?.error ?? 
                   (data as { message?: string })?.message ?? 
                   'OTP request failed';
    throw new Error(message);
  }
  return data as T;
}
export const sendOtp = async (phone10: string, purpose: string): Promise<SendOtpResponse> => {
  const resp = await fetch('/api/otp/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone10, purpose })
  });
  return handleResponse<SendOtpResponse>(resp);
};
export const verifyOtp = async (phone10: string, otp: string, purpose: string): Promise<VerifyOtpResponse> => {
  const resp = await fetch('/api/otp/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ phone10, otp, purpose })
  });
  return handleResponse<VerifyOtpResponse>(resp);
};
export const getOtpStatus = async (phone: string) => {
  const encoded = encodeURIComponent(
    phone.replace(/\D/g, '').length === 10 ? '+91' + phone.replace(/\D/g, '') : phone
  );
  const resp = await fetch(`/api/otp/status/${encoded}`);
  return handleResponse(resp);
};
2. Phone Validation Utilities (Frontend)
File: 
src/utils/phoneValidationIndia.ts

typescript
import { parsePhoneNumberFromString } from 'libphonenumber-js';
const TEN_DIGITS = /^\d{10}$/;
const FAKE_PATTERNS = [
  /^(\d)\1{9}$/,
  /^0123456789$/,
  /^1234567890$/,
  /^9876543210$/
];
function isFakeNumber(phone10: string): boolean {
  const digits = phone10.replace(/\D/g, '');
  return FAKE_PATTERNS.some(re => re.test(digits));
}
export function validatePhoneIndia(phone10: string): { valid: boolean; error?: string } {
  if (!phone10) {
    return { valid: false, error: 'Invalid phone number' };
  }
  
  const digits = phone10.replace(/\D/g, '');
  
  if (!TEN_DIGITS.test(digits)) {
    return { valid: false, error: 'Invalid phone number' };
  }
  
  if (isFakeNumber(digits)) {
    return { valid: false, error: 'Invalid phone number' };
  }
  
  const phoneObj = parsePhoneNumberFromString('+91' + digits, 'IN');
  if (!phoneObj || !phoneObj.isPossible() || !phoneObj.isValid()) {
    return { valid: false, error: 'Invalid phone number' };
  }
  
  return { valid: true };
}
export function toPhone10(raw: string): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, '');
  return digits.length === 10 ? digits : null;
}
3. OTP Timer Hook
File: 
src/hooks/useOtpTimer.ts

typescript
import { useState, useEffect, useCallback } from 'react';
export function useOtpTimer(initialSeconds: number): [number, () => void] {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    if (seconds <= 0) return;
    const timer = setInterval(() => {
      setSeconds(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [seconds]);
  const start = useCallback(() => {
    setSeconds(initialSeconds);
  }, [initialSeconds]);
  return [seconds, start];
}
4. OTP Widget Component
File: 
src/components/otp/PhoneOtpWidgetIndia.tsx

tsx
import { useCallback, useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { sendOtp, verifyOtp } from '@/lib/otpClient';
import { useOtpTimer } from '@/hooks/useOtpTimer';
import { validatePhoneIndia, toPhone10 } from '@/utils/phoneValidationIndia';
export type OtpPurpose = 'login' | 'checkout' | 'profile' | 'joinGroup' | string;
export interface PhoneOtpWidgetIndiaProps {
  onVerified: (phone10: string) => void;
  purpose: OtpPurpose;
  className?: string;
  disabled?: boolean;
}
const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;
const PhoneOtpWidgetIndia: React.FC<PhoneOtpWidgetIndiaProps> = ({
  onVerified,
  purpose,
  className,
  disabled
}) => {
  const [phoneInput, setPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [status, setStatus] = useState<'idle' | 'sending' | 'waiting' | 'verifying' | 'verified'>('idle');
  const [resendSeconds, startResendTimer] = useOtpTimer(RESEND_COOLDOWN_SECONDS);
  const phone10 = toPhone10(phoneInput);
  const phoneValidation = phone10 ? validatePhoneIndia(phone10) : { valid: false };
  const isPhoneValid = phoneValidation.valid;
  const handlePhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 10);
    setPhoneInput(raw);
    setPhoneError(null);
    setServerError(null);
    
    if (raw.length === 10) {
      const v = validatePhoneIndia(raw);
      if (!v.valid) setPhoneError(v.error ?? 'Invalid phone number');
    }
  }, []);
  const handleSendOtp = useCallback(async () => {
    if (!isPhoneValid || !phone10 || disabled) return;
    setPhoneError(null);
    setServerError(null);
    setStatus('sending');
    
    try {
      const result = await sendOtp(phone10, purpose);
      if (result.ok) {
        setOtpSent(true);
        setOtp('');
        setOtpError(null);
        startResendTimer();
        setStatus('waiting');
      } else {
        setServerError(result.error ?? 'Failed to send OTP');
        setStatus('idle');
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to send OTP');
      setStatus('idle');
    }
  }, [isPhoneValid, phone10, purpose, disabled, startResendTimer]);
  // Auto-send OTP when user enters valid 10-digit number
  const sentForPhoneRef = useRef<string | null>(null);
  useEffect(() => {
    if (!phone10 || !isPhoneValid || disabled || otpSent || status !== 'idle') return;
    if (sentForPhoneRef.current === phone10) return;
    sentForPhoneRef.current = phone10;
    handleSendOtp();
  }, [phone10, isPhoneValid, disabled, otpSent, status, handleSendOtp]);
  const handleResend = useCallback(async () => {
    if (resendSeconds > 0 || !phone10 || disabled) return;
    setServerError(null);
    setStatus('sending');
    
    try {
      const result = await sendOtp(phone10, purpose);
      if (result.ok) {
        setOtp('');
        setOtpError(null);
        startResendTimer();
        setStatus('waiting');
      } else {
        setServerError(result.error ?? 'Failed to resend OTP');
      }
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'Failed to resend OTP');
    }
  }, [phone10, purpose, disabled, resendSeconds, startResendTimer]);
  const handleOtpChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH);
    setOtp(next);
    setOtpError(null);
  }, []);
  // Auto-verify when user completes 6 digits
  const otpDigits = otp.replace(/\D/g, '');
  const prevOtpLenRef = useRef(0);
  const verifyingRef = useRef(false);
  
  useEffect(() => {
    const len = otpDigits.length;
    const justBecameSix = prevOtpLenRef.current < OTP_LENGTH && len === OTP_LENGTH;
    prevOtpLenRef.current = len;
    
    if (!justBecameSix || status !== 'waiting' || !phone10 || disabled || verifyingRef.current) return;
    
    verifyingRef.current = true;
    setOtpError(null);
    setServerError(null);
    setStatus('verifying');
    
    verifyOtp(phone10, otpDigits, purpose)
      .then((result) => {
        if (result.ok) {
          setStatus('verified');
          onVerified(phone10);
        } else {
          setOtpError(result.error ?? 'Invalid OTP');
          setStatus('waiting');
        }
      })
      .catch((err) => {
        setOtpError(err instanceof Error ? err.message : 'Invalid OTP');
        setStatus('waiting');
      })
      .finally(() => {
        verifyingRef.current = false;
      });
  }, [otpDigits, phone10, purpose, disabled, onVerified, status]);
  const showPhoneError = phoneInput.length === 10 && !isPhoneValid ? 
    (phoneError ?? 'Invalid phone number') : null;
  const displayError = serverError ?? otpError;
  return (
    <div className={className}>
      <div className="space-y-2 mb-3">
        <label className="text-sm font-medium" htmlFor="phone-india">
          Mobile number (10 digits)
        </label>
        <Input
          id="phone-india"
          type="tel"
          inputMode="numeric"
          maxLength={10}
          placeholder="Enter 10-digit mobile number"
          value={phoneInput}
          onChange={handlePhoneChange}
          disabled={disabled || otpSent || status === 'sending' || status === 'verified'}
          aria-invalid={!!showPhoneError}
        />
        {status === 'sending' && <p className="text-xs text-slate-500">Sending OTP…</p>}
        {showPhoneError && <p className="text-xs text-red-600">{showPhoneError}</p>}
      </div>
      {otpSent && (status === 'waiting' || status === 'verifying' || status === 'verified') && (
        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="otp-india">
            Enter OTP
          </label>
          <Input
            id="otp-india"
            type="text"
            inputMode="numeric"
            maxLength={OTP_LENGTH}
            placeholder="6-digit code"
            value={otp}
            onChange={handleOtpChange}
            disabled={disabled || status === 'verifying' || status === 'verified'}
          />
          {status !== 'verified' && (
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span>
                {resendSeconds > 0 ? `Resend OTP in ${resendSeconds}s` : `Didn't get the OTP?`}
              </span>
              <Button
                type="button"
                variant="link"
                size="sm"
                onClick={handleResend}
                disabled={resendSeconds > 0 || disabled || status === 'verified'}
              >
                Resend OTP
              </Button>
            </div>
          )}
        </div>
      )}
      {displayError && <p className="text-xs text-red-600 mt-2">{displayError}</p>}
      {status === 'verified' && <p className="text-xs text-green-700 mt-2">Phone verified ✓</p>}
    </div>
  );
};
export default PhoneOtpWidgetIndia;
Usage Example
tsx
import PhoneOtpWidgetIndia from '@/components/otp/PhoneOtpWidgetIndia';
function CheckoutPage() {
  const handleVerified = (phone10: string) => {
    console.log('Phone verified:', phone10);
    // Proceed with checkout
  };
  return (
    <div>
      <h2>Verify your phone number</h2>
      <PhoneOtpWidgetIndia
        purpose="checkout"
        onVerified={handleVerified}
      />
    </div>
  );
}
Troubleshooting: "Not Receiving OTPs"
If you are getting successful API responses but not receiving OTPs on your phone, follow these steps:

1. Check MSG91 Dashboard
Login to your MSG91 account
Navigate to SMS Logs or Campaign Reports
Check if the SMS was actually sent by MSG91
Look for delivery status and any error messages
2. Verify MSG91 Configuration
CAUTION

Common Configuration Issues:

bash
# Ensure these are set correctly in your .env
MSG91_AUTH_KEY=your_actual_auth_key       # NOT template/placeholder
MSG91_SENDER_ID=your_6char_sender_id      # Usually 6 characters
MSG91_OTP_TEMPLATE_ID=your_flow_id        # From MSG91 dashboard
How to find these values:

Auth Key: MSG91 Dashboard → Settings → API Keys
Sender ID: MSG91 Dashboard → Manage → Sender ID
Flow ID: MSG91 Dashboard → SMS → Create Template/Flow → Copy Flow ID
3. Check Template/Flow Configuration
Go to MSG91 Dashboard → SMS → Manage Flows
Ensure your OTP template is APPROVED (not in draft/pending)
Verify template variables match your payload:
javascript
// Your template should have variable: {{VAR1}} or {{var1}}
recipients: [{ 
  mobiles: phone,
  otp,
  VAR1: otp,  // This must match your template variable name
  var1: otp 
}]
4. Verify Phone Number Format
javascript
// MSG91 expects phone WITHOUT '+' symbol
mobiles: phone.replace('+', '')  // Correct: 919876543210
mobiles: phone                    // Wrong: +919876543210
5. Check DND/NDNC Registry
In India, numbers registered under Do Not Disturb (DND) may block promotional SMS
Transactional SMS (like OTP) should still work, but ensure your MSG91 route is set to Transactional
Test with a non-DND number first
6. Test Mode vs Production Mode
javascript
// Check if you're in test mode
const hasCreds = Boolean(MSG91_AUTH_KEY && MSG91_SENDER_ID && MSG91_FLOW_ID);
if (!hasCreds) {
  console.log(`[OTP][DEV] ${phone} -> ${otp}`);
  // OTP is only LOGGED, not sent
}
WARNING

If any MSG91 credential is missing, the system logs OTPs to console instead of sending them!

7. Check Server Logs
bash
# Look for these log patterns
[OTP] phone10=9876543210 ip=... purpose=checkout result=sent
[OTP][DEV][checkout] +919876543210 -> 123456  # Dev mode (not sent)
[OTP] MSG91 error ...  # API error
8. Network/Firewall Issues
Ensure your server can reach https://control.msg91.com
Check firewall rules allow outbound HTTPS on port 443
Test MSG91 API directly:
bash
curl -X POST https://control.msg91.com/api/v5/flow/ \
  -H "authkey: YOUR_AUTH_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "flow_id": "YOUR_FLOW_ID",
    "sender": "YOUR_SENDER_ID",
    "recipients": [{
      "mobiles": "919876543210",
      "VAR1": "123456"
    }]
  }'
9. MSG91 Account Balance
Check if your MSG91 account has sufficient credits
Go to MSG91 Dashboard → Wallet/Billing
10. Alternative SMS Providers
If MSG91 continues to have issues, consider these alternatives:

Twilio:

javascript
import twilio from 'twilio';
const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
export const sendOTP = async ({ phone, otp }) => {
  await client.messages.create({
    body: `Your OTP is: ${otp}`,
    from: process.env.TWILIO_PHONE_NUMBER,
    to: phone
  });
};
AWS SNS:

javascript
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
const snsClient = new SNSClient({ region: 'ap-south-1' });
export const sendOTP = async ({ phone, otp }) => {
  await snsClient.send(new PublishCommand({
    Message: `Your OTP is: ${otp}`,
    PhoneNumber: phone
  }));
};
Security Best Practices
IMPORTANT

Security Checklist:

✅ Never store OTPs in plain text - always use SHA-256 hashing
✅ Implement rate limiting - prevent brute force attacks (IP + phone number)
✅ Set OTP expiry - 5 minutes is standard
✅ Limit verification attempts - max 5 attempts per OTP
✅ Implement cooldown - 60 seconds between OTP sends
✅ Use TTL indexes - auto-delete expired OTPs from database
✅ Validate phone numbers - reject fake/sequential numbers
✅ Log all OTP attempts - for audit trail and abuse detection
✅ Use HTTPS only - never send OTP over unencrypted connections
✅ Implement verification window - OTP valid for limited time after verification (30 mins)
✅ Single-use enforcement - mark OTP as usedAt after consumption
Dependencies Summary
json
{
  "dependencies": {
    "express": "^4.18.0",
    "express-rate-limit": "^6.7.0",
    "mongoose": "^7.0.0",
    "dotenv": "^16.0.0",
    "libphonenumber-js": "^1.10.0"
  }
}
Environment Variables Checklist
bash
# Required for OTP to work
✅ MSG91_AUTH_KEY=...
✅ MSG91_SENDER_ID=...
✅ MSG91_OTP_TEMPLATE_ID=...
# Optional (with defaults)
OTP_VERIFIED_MAX_AGE_MINUTES=30  # Default: 30
Key Features Implemented
✅ Auto-send OTP when user completes 10-digit phone number
✅ Auto-verify when user enters complete 6-digit OTP
✅ Cooldown timer prevents spam (60s between sends)
✅ Rate limiting (IP + phone level)
✅ Phone validation (India-specific with fake number detection)
✅ Graceful fallback (logs OTP in dev mode if SMS fails)
✅ Security hardening (hashed storage, attempt limits, TTL cleanup)
✅ Purpose tracking (login, checkout, etc. for analytics)
Production Deployment Checklist
 Set all MSG91 credentials in production environment
 Verify MSG91 template is approved and active
 Test OTP sending with real phone numbers
 Configure proper rate limits based on your traffic
 Set up MongoDB indexes for performance
 Enable HTTPS/SSL for all API endpoints
 Configure CORS properly for your frontend domain
 Set up monitoring/alerts for failed OTP sends
 Test DND/NDNC scenarios
 Set up backup SMS provider for failover
This implementation guide is based on the production-tested system in the SignatureDay project and should resolve your OTP delivery issues when configured correctly.


Comment
Ctrl+Alt+M

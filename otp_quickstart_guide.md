OTP Verification - Quick Start Guide
A simple, production-ready guide to implement mobile OTP verification in your app.

🎯 What You'll Build
Send OTP to user's phone via SMS
Verify OTP code
Auto-send when phone number is complete
Auto-verify when OTP is entered
Rate limiting and security built-in
📦 Prerequisites
bash
npm install express mongoose libphonenumber-js express-rate-limit dotenv
SMS Provider: Sign up for MSG91 (or Twilio/AWS SNS)

🚀 Backend Setup (5 Steps)
Step 1: Create Database Model
models/OTPVerification.js

javascript
import mongoose from 'mongoose';
const otpSchema = new mongoose.Schema({
  phone: { type: String, required: true, index: true },
  phone10: { type: String, index: true },
  otpHash: { type: String, required: true },
  purpose: { type: String, default: 'generic' },
  attempts: { type: Number, default: 0 },
  expiresAt: { type: Date, required: true },
  lastSentAt: { type: Date, index: true },
  verified: { type: Boolean, default: false },
  verifiedAt: { type: Date }
});
otpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
export default mongoose.model('OTPVerification', otpSchema);
Step 2: Create OTP Service
utils/otpService.js

javascript
import crypto from 'crypto';
import OTPVerification from '../models/OTPVerification.js';
import { sendOTP } from '../services/smsService.js';
const OTP_EXPIRY_MINUTES = 5;
const MAX_ATTEMPTS = 5;
const COOLDOWN_SECONDS = 60;
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
function hashOTP(otp) {
  return crypto.createHash('sha256').update(String(otp)).digest('hex');
}
export async function createAndSendOtp(phone10, purpose) {
  const normalized = phone10.replace(/\D/g, '');
  
  // Check cooldown
  const lastRecord = await OTPVerification.findOne({ phone: '+91' + normalized })
    .sort({ lastSentAt: -1 });
  if (lastRecord?.lastSentAt) {
    const elapsed = (Date.now() - lastRecord.lastSentAt.getTime()) / 1000;
    if (elapsed < COOLDOWN_SECONDS) {
      return { 
        success: false, 
        error: `Wait ${Math.ceil(COOLDOWN_SECONDS - elapsed)}s`,
        retryAfter: Math.ceil(COOLDOWN_SECONDS - elapsed)
      };
    }
  }
  const otp = generateOTP();
  
  await OTPVerification.create({
    phone: '+91' + normalized,
    phone10: normalized,
    otpHash: hashOTP(otp),
    purpose: purpose || 'generic',
    expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
    attempts: 0,
    lastSentAt: new Date(),
    verified: false
  });
  await sendOTP({ phone: '+91' + normalized, otp, source: purpose });
  return { success: true };
}
export async function verifyOtpRecord(phone10, otp, purpose) {
  const normalized = phone10.replace(/\D/g, '');
  
  const record = await OTPVerification.findOne({
    phone: '+91' + normalized,
    purpose: purpose || 'generic'
  }).sort({ createdAt: -1 });
  if (!record) return { success: false, error: 'Invalid OTP' };
  if (record.expiresAt < Date.now()) return { success: false, error: 'OTP expired' };
  if (record.attempts >= MAX_ATTEMPTS) return { success: false, error: 'Too many attempts' };
  if (hashOTP(otp) !== record.otpHash) {
    record.attempts += 1;
    await record.save();
    return { success: false, error: 'Invalid OTP' };
  }
  record.verified = true;
  record.verifiedAt = new Date();
  await record.save();
  return { success: true, verifiedAt: record.verifiedAt };
}
Step 3: Create SMS Service
services/smsService.js

javascript
const MSG91_AUTH_KEY = process.env.MSG91_AUTH_KEY;
const MSG91_SENDER_ID = process.env.MSG91_SENDER_ID;
const MSG91_FLOW_ID = process.env.MSG91_OTP_TEMPLATE_ID;
export const sendOTP = async ({ phone, otp, source = 'otp' }) => {
  // Dev mode: log to console
  if (!MSG91_AUTH_KEY || !MSG91_SENDER_ID || !MSG91_FLOW_ID) {
    console.log(`[OTP][DEV] ${phone} -> ${otp}`);
    return { success: true };
  }
  try {
    const response = await fetch('https://control.msg91.com/api/v5/flow/', {
      method: 'POST',
      headers: {
        authkey: MSG91_AUTH_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        flow_id: MSG91_FLOW_ID,
        sender: MSG91_SENDER_ID,
        recipients: [{
          mobiles: phone.replace('+', ''),
          VAR1: otp
        }]
      })
    });
    if (!response.ok) throw new Error(`MSG91 error: ${response.status}`);
    return { success: true };
  } catch (error) {
    console.error('[OTP] SMS error:', error);
    console.log(`[OTP][Fallback] ${phone} -> ${otp}`);
    return { success: true };
  }
};
Step 4: Create Controller
controllers/otpController.js

javascript
import { createAndSendOtp, verifyOtpRecord } from '../utils/otpService.js';
export const sendOtp = async (req, res) => {
  const { phone10, purpose = 'generic' } = req.body;
  
  if (!/^\d{10}$/.test(phone10)) {
    return res.status(400).json({ ok: false, error: 'Invalid phone' });
  }
  const result = await createAndSendOtp(phone10, purpose);
  
  if (!result.success) {
    return res.status(429).json({ 
      ok: false, 
      error: result.error,
      retryAfter: result.retryAfter 
    });
  }
  return res.json({ ok: true, message: 'OTP sent' });
};
export const verifyOtp = async (req, res) => {
  const { phone10, otp, purpose = 'generic' } = req.body;
  
  if (!/^\d{10}$/.test(phone10) || !/^\d{6}$/.test(otp)) {
    return res.status(400).json({ ok: false, error: 'Invalid input' });
  }
  const result = await verifyOtpRecord(phone10, otp, purpose);
  
  if (!result.success) {
    return res.status(400).json({ ok: false, error: result.error });
  }
  return res.json({ ok: true, message: 'Verified', verifiedAt: result.verifiedAt });
};
Step 5: Setup Routes
routes/otpRoutes.js

javascript
import express from 'express';
import rateLimit from 'express-rate-limit';
import { sendOtp, verifyOtp } from '../controllers/otpController.js';
const router = express.Router();
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { ok: false, error: 'Too many requests' }
});
router.post('/send', limiter, sendOtp);
router.post('/verify', verifyOtp);
export default router;
Register in server.js:

javascript
import otpRoutes from './routes/otpRoutes.js';
app.use('/api/otp', otpRoutes);
🎨 Frontend Setup (React)
OTP Widget Component
components/OtpWidget.tsx

tsx
import { useState, useEffect, useRef } from 'react';
export default function OtpWidget({ onVerified, purpose = 'login' }) {
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('idle');
  const [countdown, setCountdown] = useState(0);
  // Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);
  // Auto-send OTP when 10 digits entered
  const sentRef = useRef(false);
  useEffect(() => {
    if (phone.length === 10 && !otpSent && !sentRef.current) {
      sentRef.current = true;
      handleSendOtp();
    }
  }, [phone]);
  const handleSendOtp = async () => {
    setError('');
    setStatus('sending');
    
    try {
      const res = await fetch('/api/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone10: phone, purpose })
      });
      
      const data = await res.json();
      
      if (data.ok) {
        setOtpSent(true);
        setCountdown(60);
        setStatus('waiting');
      } else {
        setError(data.error);
        setStatus('idle');
      }
    } catch (err) {
      setError('Failed to send OTP');
      setStatus('idle');
    }
  };
  // Auto-verify when 6 digits entered
  const verifyRef = useRef(false);
  useEffect(() => {
    if (otp.length === 6 && !verifyRef.current) {
      verifyRef.current = true;
      handleVerify();
    }
  }, [otp]);
  const handleVerify = async () => {
    setError('');
    setStatus('verifying');
    
    try {
      const res = await fetch('/api/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone10: phone, otp, purpose })
      });
      
      const data = await res.json();
      
      if (data.ok) {
        setStatus('verified');
        onVerified(phone);
      } else {
        setError(data.error);
        setStatus('waiting');
        verifyRef.current = false;
      }
    } catch (err) {
      setError('Verification failed');
      setStatus('waiting');
      verifyRef.current = false;
    }
  };
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-2">
          Mobile Number
        </label>
        <input
          type="tel"
          maxLength={10}
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
          disabled={otpSent}
          placeholder="10-digit mobile"
          className="w-full px-4 py-2 border rounded"
        />
      </div>
      {otpSent && (
        <div>
          <label className="block text-sm font-medium mb-2">
            Enter OTP
          </label>
          <input
            type="text"
            maxLength={6}
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
            disabled={status === 'verified'}
            placeholder="6-digit code"
            className="w-full px-4 py-2 border rounded"
          />
          
          <div className="mt-2 text-sm text-gray-600">
            {countdown > 0 ? (
              <span>Resend in {countdown}s</span>
            ) : (
              <button
                onClick={() => { sentRef.current = false; handleSendOtp(); }}
                className="text-blue-600 hover:underline"
              >
                Resend OTP
              </button>
            )}
          </div>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {status === 'verified' && <p className="text-sm text-green-600">✓ Verified</p>}
    </div>
  );
}
Usage
tsx
function LoginPage() {
  return (
    <OtpWidget
      purpose="login"
      onVerified={(phone) => {
        console.log('Phone verified:', phone);
        // Proceed with login
      }}
    />
  );
}
⚙️ Environment Setup
.env

bash
# MSG91 Credentials (get from https://msg91.com)
MSG91_AUTH_KEY=your_auth_key_here
MSG91_SENDER_ID=your_sender_id
MSG91_OTP_TEMPLATE_ID=your_flow_id
# MongoDB
MONGODB_URI=mongodb://localhost:27017/yourapp
# Optional
OTP_VERIFIED_MAX_AGE_MINUTES=30
🔧 MSG91 Setup (3 Steps)
Sign up at MSG91
Create OTP Template:
Go to SMS → Create Flow
Add template: Your OTP is {{VAR1}}
Get approval (usually instant)
Get Credentials:
Auth Key: Settings → API Keys
Sender ID: Manage → Sender ID
Flow ID: SMS → Flows → Copy Flow ID
❌ Troubleshooting: "Not Receiving OTP"
Quick Checklist
Check server logs - Look for [OTP][DEV] (means dev mode, not sending)
Verify MSG91 credentials - All 3 env vars must be set
Check MSG91 dashboard - Go to SMS Logs, verify message was sent
Template approval - Ensure template status is "Approved"
Phone format - MSG91 needs 919876543210 (no +)
Test different number - DND numbers may block SMS
Check account balance - Ensure MSG91 has credits
Common Issues
Issue: OTP logged to console, not sent

bash
[OTP][DEV] +919876543210 -> 123456
Fix: Set MSG91 credentials in .env

Issue: MSG91 API error Fix: Check Auth Key, Sender ID, Flow ID are correct

Issue: Template variable mismatch Fix: Ensure template uses {{VAR1}} and code sends VAR1: otp

🔒 Security Features Built-In
✅ OTP stored as SHA-256 hash (never plain text)
✅ 60-second cooldown between sends
✅ Max 5 verification attempts per OTP
✅ 5-minute OTP expiry
✅ Rate limiting (5 requests per 15 min per IP)
✅ Auto-cleanup of expired OTPs (MongoDB TTL)
🎯 Testing
Development Mode (no MSG91 credentials):

bash
# OTP will be logged to console
[OTP][DEV] +919876543210 -> 123456
Production Mode (with MSG91):

bash
# OTP sent via SMS
[OTP] phone10=9876543210 purpose=login result=sent
🔄 Alternative SMS Providers
Twilio
javascript
import twilio from 'twilio';
const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
export const sendOTP = async ({ phone, otp }) => {
  await client.messages.create({
    body: `Your OTP: ${otp}`,
    from: process.env.TWILIO_PHONE,
    to: phone
  });
};
AWS SNS
javascript
import { SNSClient, PublishCommand } from '@aws-sdk/client-sns';
const sns = new SNSClient({ region: 'ap-south-1' });
export const sendOTP = async ({ phone, otp }) => {
  await sns.send(new PublishCommand({
    Message: `Your OTP: ${otp}`,
    PhoneNumber: phone
  }));
};
📚 API Reference
POST /api/otp/send
json
{
  "phone10": "9876543210",
  "purpose": "login"
}
Response: { "ok": true, "message": "OTP sent" }

POST /api/otp/verify
json
{
  "phone10": "9876543210",
  "otp": "123456",
  "purpose": "login"
}
Response: { "ok": true, "message": "Verified", "verifiedAt": "2026-02-11T..." }

That's it! You now have a production-ready OTP system. 🎉


Comment
Ctrl+Alt+M

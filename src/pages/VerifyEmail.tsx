import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';

import logo from '@/assets/logo.webp';

const VerifyEmail: React.FC = () => {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [step, setStep] = useState<'EMAIL' | 'OTP'>('EMAIL');
  const [serverOtp, setServerOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendOtp = async () => {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast.error('Please enter a valid email');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.sendEmailVerificationLater(email);
      if (res.success) {
        if (res.serverOtp) setServerOtp(res.serverOtp);
        setStep('OTP');
        toast.success('OTP sent to your email');
      }
    } catch (err: any) {
      toast.error(err.message || 'Failed to send OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    const otpValue = otp.join('');
    if (otpValue.length < 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.confirmEmailVerificationLater(otpValue, serverOtp);
      if (res.success) {
        toast.success('Email verified successfully!');
        await refreshUser(); // Refresh user data to update verification status
        navigate('/dashboard');
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid OTP');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      <div className="max-w-md w-full p-8 border border-gray-100 rounded-2xl shadow-sm">
        <div className="flex flex-col items-center mb-8">
          <img src={logo} alt="ShelfMerch Logo" className="h-12 mb-6" />
          <h2 className="text-2xl font-bold text-black text-center">Verify Your Email</h2>
        </div>

        {step === 'EMAIL' ? (
          <div className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSendOtp}
              disabled={isLoading}
              className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:opacity-90 disabled:bg-gray-200 disabled:cursor-not-allowed transition-all shadow-md active:scale-[0.98]"
            >
              {isLoading ? 'Sending...' : 'Send OTP'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            <p className="text-sm text-gray-500 text-center">
              Enter the 6-digit code sent to <span className="text-black font-medium">{email}</span>
            </p>
            <div className="flex justify-center gap-2">
              {otp.map((digit, index) => (
                <input
                  key={index}
                  id={`otp-${index}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-xl font-bold border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  disabled={isLoading}
                />
              ))}
            </div>
            <button
              onClick={handleVerifyOtp}
              disabled={isLoading}
              className="w-full bg-primary text-white py-3 rounded-xl font-semibold hover:opacity-90 disabled:bg-gray-200 disabled:cursor-not-allowed transition-all shadow-md active:scale-[0.98]"
            >
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </button>
            <button
              onClick={() => setStep('EMAIL')}
              disabled={isLoading}
              className="w-full text-gray-500 text-sm hover:text-black transition-colors"
            >
              Change Email
            </button>
          </div>
        )}

        <div className="mt-8 flex justify-center">
          <button
            onClick={() => navigate('/dashboard')}
            className="text-gray-400 text-sm hover:text-gray-600 transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;

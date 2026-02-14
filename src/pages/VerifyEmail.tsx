import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';

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
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h2 className="text-2xl font-bold text-center mb-6">Verify Your Email</h2>

        {step === 'EMAIL' ? (
          <div className="space-y-4">
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
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isLoading}
              />
            </div>
            <button
              onClick={handleSendOtp}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Sending...' : 'Send OTP'}
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 text-center">
              Enter the 6-digit code sent to {email}
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
                  className="w-12 h-12 text-center text-xl border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  disabled={isLoading}
                />
              ))}
            </div>
            <button
              onClick={handleVerifyOtp}
              disabled={isLoading}
              className="w-full bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? 'Verifying...' : 'Verify Email'}
            </button>
            <button
              onClick={() => setStep('EMAIL')}
              disabled={isLoading}
              className="w-full text-blue-600 py-2 rounded-lg hover:bg-blue-50 transition-colors"
            >
              Change Email
            </button>
          </div>
        )}

        <button
          onClick={() => navigate('/dashboard')}
          className="w-full mt-4 text-gray-600 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
};

export default VerifyEmail;

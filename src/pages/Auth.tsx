import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { authApi } from '@/lib/api';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import logo from '@/assets/logo.webp';
import googleLogo from '@/assets/google-logo-new.png';
import { PasswordInput } from '@/components/ui/PasswordInput';

type AuthStep =
  | 'IDENTIFIER'
  | 'PASSWORD'
  | 'VERIFY_PRIMARY'
  | 'SECONDARY_ID'
  | 'VERIFY_SECONDARY'
  | 'NAME';

const Auth = () => {
  const navigate = useNavigate();
  const { login, loginWithOtp, signupComplete } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  // App State
  const [step, setStep] = useState<AuthStep>('IDENTIFIER');
  const [flow, setFlow] = useState<'login' | 'signup'>('login');
  const [entryType, setEntryType] = useState<'email' | 'phone' | null>(null);
  const [exists, setExists] = useState(false);

  // Field States
  const [identifier, setIdentifier] = useState(''); // Primary
  const [secondaryIdentifier, setSecondaryIdentifier] = useState(''); // Secondary
  const [otp, setOtp] = useState(['', '', '', '', '', '']); // Multi-use OTP
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [serverOtp, setServerOtp] = useState('');

  // Validation
  const validatePhone = (p: string) => /^\d{10}$/.test(p);
  const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

  // OTP change handler
  const handleOtpChange = (index: number, value: string) => {
    if (value && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      document.getElementById(`otp-${index + 1}`)?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      document.getElementById(`otp-${index - 1}`)?.focus();
    }
  };

  // Step 1: Handle Primary Entry
  const handleIdentifierSubmit = async () => {
    if (!identifier) {
      toast.error('Please enter email or phone number');
      return;
    }
    const isEmail = identifier.includes('@');
    if (!isEmail && !validatePhone(identifier)) {
      toast.error('Please enter a valid email or 10-digit mobile number');
      return;
    }

    setIsLoading(true);
    try {
      const res = await authApi.initLoginOtp(identifier);
      if (res.success) {
        setExists(res.exists);
        setEntryType(res.type);
        setFlow(res.exists ? 'login' : 'signup');

        if (res.exists) {
          if (res.flow === 'password') {
            setStep('PASSWORD');
          } else {
            if (res.serverOtp) setServerOtp(res.serverOtp);
            setStep('VERIFY_PRIMARY');
          }
        } else {
          // Signup Flow Start
          if (res.serverOtp) setServerOtp(res.serverOtp);
          setStep('VERIFY_PRIMARY');
        }
        toast.success(res.message);
      }
    } catch (err: any) {
      toast.error(err.message || 'Error processing request');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Primary Verification (OTP or Password)
  const handlePrimaryVerify = async () => {
    if (step === 'PASSWORD') {
      if (!password) { toast.error('Please enter password'); return; }
      setIsLoading(true);
      try {
        await login(identifier, password);
        toast.success('Welcome back!');
        navigate('/dashboard');
      } catch (err: any) {
        toast.error(err.message || 'Invalid password');
      } finally { setIsLoading(false); }
    } else {
      // Primary OTP Verify
      const otpValue = otp.join('');
      if (otpValue.length < 6) { toast.error('Enter 6-digit code'); return; }

      if (flow === 'login') {
        setIsLoading(true);
        try {
          await loginWithOtp(identifier, otpValue, serverOtp);
          toast.success('Welcome back!');
          navigate('/dashboard');
        } catch (err: any) {
          toast.error(err.message || 'Invalid code');
        } finally { setIsLoading(false); }
      } else {
        // Signup: Primary Verify Success - go directly to NAME step
        if (entryType === 'email') {
          // Email verified via serverOtp comparison
          if (otpValue === serverOtp) {
            setStep('NAME');
            setOtp(['', '', '', '', '', '']);
          } else { toast.error('Invalid code'); }
        } else {
          // Phone verified via backend
          setIsLoading(true);
          try {
            const res = await authApi.verifyLoginOtp(identifier, otpValue);
            if (res.success) {
              setStep('NAME');
              setOtp(['', '', '', '', '', '']);
              setServerOtp('');
            }
          } catch (err: any) {
            toast.error(err.message || 'Invalid OTP');
          } finally {
            setIsLoading(false);
          }
        }
      }
    }
  };

  // Step 3 (Signup): Secondary Identifier Entry
  const handleSecondaryIdentifierSubmit = async () => {
    if (!secondaryIdentifier) {
      toast.error(`Please enter ${entryType === 'email' ? 'phone number' : 'email address'}`);
      return;
    }

    if (entryType === 'email') {
      if (!validatePhone(secondaryIdentifier)) {
        toast.error('Enter a valid 10-digit phone number');
        return;
      }
      setIsLoading(true);
      try {
        const res = await authApi.initLoginOtp(secondaryIdentifier);
        if (res.success) {
          if (res.serverOtp) setServerOtp(res.serverOtp);
          setStep('VERIFY_SECONDARY');
          toast.success('OTP sent to your phone');
        }
      } catch (err: any) {
        toast.error(err.message || 'Error sending OTP');
      } finally {
        setIsLoading(false);
      }
    } else {
      if (!validateEmail(secondaryIdentifier)) {
        toast.error('Enter a valid email address');
        return;
      }
      setIsLoading(true);
      try {
        const res = await authApi.initSignupEmailOtp(secondaryIdentifier, name);
        if (res.success) {
          if (res.serverOtp) setServerOtp(res.serverOtp);
          setStep('VERIFY_SECONDARY');
          toast.success('Email verification code sent');
        }
      } catch (err: any) {
        toast.error(err.message || 'Error processing request');
      } finally { setIsLoading(false); }
    }
  };

  // Step 4 (Signup): Secondary Verification
  const handleSecondaryVerify = async () => {
    const otpValue = otp.join('');
    if (otpValue.length < 6) { toast.error('Enter 6-digit code'); return; }

    if (entryType === 'email') {
      // Secondary is phone - verify via backend
      setIsLoading(true);
      try {
        const res = await authApi.verifyLoginOtp(secondaryIdentifier, otpValue);
        if (res.success) {
          setStep('NAME');
          setOtp(['', '', '', '', '', '']);
        }
      } catch (err: any) {
        toast.error(err.message || 'Invalid code');
      } finally {
        setIsLoading(false);
      }
    } else {
      // Secondary is email
      if (otpValue === serverOtp) {
        setStep('NAME');
        setOtp(['', '', '', '', '', '']);
      } else { toast.error('Invalid code'); }
    }
  };

  // Step 5 (Signup): Name Entry & Complete
  const handleSignupComplete = async () => {
    if (!name) { toast.error('Please enter your name'); return; }

    setIsLoading(true);
    try {
      const signupData: any = {
        name,
        otp: 'Verified',
        serverOtp: 'Verified'
      };

      // Only send the verified identifier
      if (entryType === 'email') {
        signupData.email = identifier;
      } else {
        signupData.phone = identifier;
      }

      await signupComplete(signupData);
      toast.success('Account successfully created');
      navigate('/dashboard');
    } catch (err: any) {
      toast.error(err.message || 'Error creating account');
    } finally { setIsLoading(false); }
  };

  const resetFlow = () => {
    setStep('IDENTIFIER');
    setFlow('login');
    setEntryType(null);
    setExists(false);
    setIdentifier('');
    setSecondaryIdentifier('');
    setOtp(['', '', '', '', '', '']);
    setPassword('');
    setName('');
    setServerOtp('');
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-white">
      {/* Left Side: Headlines & Illustration - Hidden on Mobile */}
      <div className="hidden lg:flex lg:w-3/5 flex-col items-center justify-center p-12 bg-[#f0f9ff] overflow-hidden">
        <div className="max-w-xl w-full text-center mb-12 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <h1 className="text-4xl xl:text-5xl font-extrabold text-[#1a1a1a] mb-4 tracking-tight">
            Design. Publish. Sell.
          </h1>
          <p className="text-xl xl:text-2xl font-medium text-gray-600">
            Your Merch Store — Live in Minutes.
          </p>
        </div>

        <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl shadow-blue-100/50 p-2 animate-in fade-in zoom-in duration-1000">
          <img
            src="/auth-illustration.png"
            alt="Design and Sell Merch"
            className="w-full h-auto object-contain rounded-xl"
          />
        </div>
      </div>

      {/* Right Side: Auth Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12 bg-white">
        <div className="w-full max-w-sm flex flex-col">
          {/* Logo - Centered on all screen sizes */}
          <div className="flex justify-center mb-12">
            <Link to="/" onClick={resetFlow}>
              <img src={logo} alt="ShelfMerch" className="h-12 w-auto" />
            </Link>
          </div>

          <div className="bg-white border border-gray-100 rounded-3xl p-10 shadow-2xl shadow-gray-200/50">
            <h2 className="text-2xl font-bold mb-8 text-gray-900 tracking-tight">
              {step === 'IDENTIFIER' ? 'Sign-In or Create' : (flow === 'login' ? 'Sign-In' : 'Create Account')}
            </h2>

            <div className="space-y-6">
              {/* Step 1: Identifier Entry */}
              {step === 'IDENTIFIER' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="identifier" className="text-sm font-semibold text-gray-600 ml-1">Email or mobile phone number</Label>
                    <Input
                      id="identifier"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      className="h-12 rounded-xl border-gray-200 focus:ring-2 focus:ring-[#39b38e]/20 focus:border-[#39b38e] transition-all"
                      placeholder="Enter email or phone"
                    />
                  </div>
                  <Button
                    className="w-full h-12 bg-[#39b38e] hover:bg-[#32a17f] text-white font-bold text-lg rounded-xl shadow-lg shadow-[#39b38e]/20 transition-all active:scale-[0.98]"
                    onClick={handleIdentifierSubmit}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Continue'}
                  </Button>
                </>
              )}

              {/* Step 2: Password Entry (Existing User) */}
              {step === 'PASSWORD' && (
                <div className="animate-in fade-in slide-in-from-top-2 space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <Label htmlFor="login-password" title={identifier} className="text-sm font-semibold text-gray-600 truncate max-w-[150px]">Password</Label>
                      <button onClick={() => setStep('IDENTIFIER')} className="text-xs font-bold text-[#39b38e] hover:underline">Change</button>
                    </div>
                    <PasswordInput
                      id="login-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-12 rounded-xl border-gray-200 focus:ring-2 focus:ring-[#39b38e]/20 focus:border-[#39b38e] transition-all"
                      placeholder="Enter password"
                    />
                  </div>
                  <Button
                    className="w-full h-12 bg-[#39b38e] hover:bg-[#32a17f] text-white font-bold text-lg rounded-xl shadow-lg shadow-[#39b38e]/20 transition-all active:scale-[0.98]"
                    onClick={handlePrimaryVerify}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Sign-In'}
                  </Button>
                </div>
              )}

              {/* Step 3: Verification */}
              {(step === 'VERIFY_PRIMARY' || step === 'VERIFY_SECONDARY') && (
                <div className="animate-in fade-in slide-in-from-top-2 space-y-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                      <Label htmlFor="otp-0" title={step === 'VERIFY_PRIMARY' ? identifier : secondaryIdentifier} className="text-sm font-semibold text-gray-600 truncate max-w-[150px]">
                        Verification Code
                      </Label>
                      {step === 'VERIFY_PRIMARY' && (
                        <button onClick={() => setStep('IDENTIFIER')} className="text-xs font-bold text-[#39b38e] hover:underline">Change</button>
                      )}
                    </div>
                    <div className="flex gap-3 justify-between">
                      {otp.map((digit, i) => (
                        <Input
                          key={i}
                          id={`otp-${i}`}
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(i, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(i, e)}
                          className="text-center w-full h-12 text-lg font-bold rounded-xl border-gray-200 focus:ring-2 focus:ring-[#39b38e]/20 focus:border-[#39b38e] transition-all"
                        />
                      ))}
                    </div>
                  </div>
                  <Button
                    className="w-full h-12 bg-[#39b38e] hover:bg-[#32a17f] text-white font-bold text-lg rounded-xl shadow-lg shadow-[#39b38e]/20 transition-all active:scale-[0.98]"
                    onClick={step === 'VERIFY_PRIMARY' ? handlePrimaryVerify : handleSecondaryVerify}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Verify'}
                  </Button>
                </div>
              )}

              {/* Step 4: Secondary Identifier (Signup) */}
              {step === 'SECONDARY_ID' && (
                <div className="animate-in fade-in slide-in-from-top-2 space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="secondary-identifier" className="text-sm font-semibold text-gray-600 ml-1">
                      {entryType === 'email' ? 'Phone Number' : 'Email Address'}
                    </Label>
                    <Input
                      id="secondary-identifier"
                      value={secondaryIdentifier}
                      onChange={(e) => setSecondaryIdentifier(e.target.value)}
                      className="h-12 rounded-xl border-gray-200 focus:ring-2 focus:ring-[#39b38e]/20 focus:border-[#39b38e] transition-all"
                      placeholder={entryType === 'email' ? '10-digit phone number' : 'name@example.com'}
                    />
                  </div>
                  <Button
                    className="w-full h-12 bg-[#39b38e] hover:bg-[#32a17f] text-white font-bold text-lg rounded-xl shadow-lg shadow-[#39b38e]/20 transition-all active:scale-[0.98]"
                    onClick={handleSecondaryIdentifierSubmit}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Continue'}
                  </Button>
                </div>
              )}

              {/* Step 5: Name Entry (Signup) */}
              {step === 'NAME' && (
                <div className="animate-in fade-in slide-in-from-top-2 space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-sm font-semibold text-gray-600 ml-1">Your name</Label>
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="h-12 rounded-xl border-gray-200 focus:ring-2 focus:ring-[#39b38e]/20 focus:border-[#39b38e] transition-all"
                      placeholder="First and last name"
                    />
                  </div>
                  <Button
                    className="w-full h-12 bg-[#39b38e] hover:bg-[#32a17f] text-white font-bold text-lg rounded-xl shadow-lg shadow-[#39b38e]/20 transition-all active:scale-[0.98]"
                    onClick={handleSignupComplete}
                    disabled={isLoading}
                  >
                    {isLoading ? <Loader2 className="animate-spin h-5 w-5" /> : 'Complete Setup'}
                  </Button>
                </div>
              )}
            </div>

            <p className="mt-8 text-xs text-gray-400 text-center leading-relaxed">
              By continuing, you agree to ShelfMerch's{' '}
              <Link to="#" className="text-blue-500 font-medium hover:underline">Conditions of Use</Link> and{' '}
              <Link to="#" className="text-blue-500 font-medium hover:underline">Privacy Notice</Link>.
            </p>
          </div>

          <footer className="mt-12 text-center text-[10px] text-gray-400 font-medium">
            <p>© 2026, ShelfMerch.in, Inc. or its affiliates</p>
          </footer>
        </div>
      </div>
    </div>
  );
};

export default Auth;

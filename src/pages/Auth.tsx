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
    <div className="min-h-screen flex flex-col items-center bg-white pt-10 px-4">
      <Link to="/" onClick={resetFlow} className="mb-8">
        <img src={logo} alt="ShelfMerch" className="h-10 w-auto" />
      </Link>

      <div className="w-full max-w-sm border rounded-lg p-6 shadow-sm">
        <h1 className="text-2xl font-semibold mb-6">
          {step === 'IDENTIFIER' ? 'Sign-In or Create' : (flow === 'login' ? 'Sign-In' : 'Create Account')}
        </h1>

        <div className="space-y-4">
          {/* Step 1: Identifier Entry */}
          {step === 'IDENTIFIER' && (
            <>
              <div>
                <Label htmlFor="identifier" className="font-bold">Email or mobile phone number</Label>
                <Input
                  id="identifier"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  className="mt-1"
                  placeholder="Enter email or phone"
                />
              </div>
              <Button className="w-full bg-[#39b38e] hover:bg-[#1f916f] text-black shadow-sm" onClick={handleIdentifierSubmit} disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Continue'}
              </Button>
            </>
          )}

          {/* Step 2: Password Entry (Existing User) */}
          {step === 'PASSWORD' && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-1">
                <Label htmlFor="login-password" title={identifier} className="font-bold truncate max-w-[150px]">Password</Label>
                <button onClick={() => setStep('IDENTIFIER')} className="text-xs text-blue-600 hover:underline">Change</button>
              </div>
              <PasswordInput
                id="login-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
                placeholder="Enter password"
              />
              <Button className="w-full mt-4 bg-[#f0c14b] hover:bg-[#edb833] text-black shadow-sm" onClick={handlePrimaryVerify} disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Sign-In'}
              </Button>
            </div>
          )}

          {/* Step 3: Verification (Existing OTP OR New Step 1) */}
          {(step === 'VERIFY_PRIMARY' || step === 'VERIFY_SECONDARY') && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <div className="flex justify-between items-center mb-1">
                <Label htmlFor="otp-0" title={step === 'VERIFY_PRIMARY' ? identifier : secondaryIdentifier} className="font-bold truncate max-w-[150px]">
                  Verification Code
                </Label>
                {step === 'VERIFY_PRIMARY' && (
                  <button onClick={() => setStep('IDENTIFIER')} className="text-xs text-blue-600 hover:underline">Change</button>
                )}
              </div>
              <div className="flex gap-2 mb-4">
                {otp.map((digit, i) => (
                  <Input
                    key={i}
                    id={`otp-${i}`}
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className="text-center w-10 h-10"
                  />
                ))}
              </div>
              <Button
                className="w-full bg-[#f0c14b] hover:bg-[#edb833] text-black shadow-sm"
                onClick={step === 'VERIFY_PRIMARY' ? handlePrimaryVerify : handleSecondaryVerify}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Verify'}
              </Button>
            </div>
          )}

          {/* Step 4: Secondary Identifier (Signup) */}
          {step === 'SECONDARY_ID' && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <Label htmlFor="secondary-identifier" className="font-bold">
                {entryType === 'email' ? 'Enter Phone Number' : 'Enter Email Address'}
              </Label>
              <Input
                id="secondary-identifier"
                value={secondaryIdentifier}
                onChange={(e) => setSecondaryIdentifier(e.target.value)}
                className="mt-1"
                placeholder={entryType === 'email' ? '10-digit phone number' : 'name@example.com'}
              />
              <Button className="w-full mt-4 bg-[#39b38e] hover:bg-[#1f916f] text-black shadow-sm" onClick={handleSecondaryIdentifierSubmit} disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Continue'}
              </Button>
            </div>
          )}

          {/* Step 5: Name Entry (Signup) */}
          {step === 'NAME' && (
            <div className="animate-in fade-in slide-in-from-top-2">
              <Label htmlFor="name" className="font-bold">Your name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
                placeholder="First and last name"
              />
              <Button className="w-full mt-4 bg-[#39b38e] hover:bg-[#1f916f] text-black shadow-sm" onClick={handleSignupComplete} disabled={isLoading}>
                {isLoading ? <Loader2 className="animate-spin h-4 w-4" /> : 'Complete Setup'}
              </Button>
            </div>
          )}

        </div>
      </div>

      {/* <div className="w-full max-w-sm mt-8">
        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-white px-2 text-gray-500 font-medium">Buying for work?</span>
          </div>
        </div>

        <Button
          variant="outline"
          className="w-full text-sm font-normal py-1 h-auto"
          onClick={() => window.location.href = 'http://localhost:5000/api/auth/google'}
        >
          <img src={googleLogo} alt="Google" className="h-4 w-4 mr-2" />
          Sign in with Google
        </Button>
      </div>

      <footer className="mt-12 text-center text-xs space-y-4 pb-10">
        <div className="flex justify-center gap-6 text-blue-600">
          <Link to="#" className="hover:underline">Conditions of Use</Link>
          <Link to="#" className="hover:underline">Privacy Notice</Link>
          <Link to="#" className="hover:underline">Help</Link>
        </div>
        <p className="text-gray-500">
          © 2026, ShelfMerch.in, Inc. or its affiliates
        </p>
      </footer> */}
    </div>
  );
};

export default Auth;

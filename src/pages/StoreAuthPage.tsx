import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStoreAuth } from '@/contexts/StoreAuthContext';
import { storeApi } from '@/lib/api';
import { Store } from '@/types';
import { getTenantSlugFromLocation, buildStorePath } from '@/utils/tenantUtils';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import googleLogo from '@/assets/google-logo-new.png';
import { API_BASE_URL } from '@/config';

type AuthStep = 'IDENTIFIER' | 'VERIFY' | 'NAME';

const StoreAuthPage = () => {
    const params = useParams<{ subdomain: string }>();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { sendOtp, verifyOtp, signupComplete, isAuthenticated, customer } = useStoreAuth();

    const subdomain = getTenantSlugFromLocation(location, params) || params.subdomain;

    const [store, setStore] = useState<Store | null>(null);
    const [loading, setLoading] = useState(true);
    const [step, setStep] = useState<AuthStep>('IDENTIFIER');
    const [isLoadingAuth, setIsLoadingAuth] = useState(false);

    // Form states
    const [identifier, setIdentifier] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [name, setName] = useState('');
    const [entryType, setEntryType] = useState<'email' | 'phone' | null>(null);
    const [exists, setExists] = useState(false);

    const redirectPath = searchParams.get('redirect') || '';

    // Handle OAuth Callback/Token from URL
    useEffect(() => {
        const token = searchParams.get('token');
        if (token && subdomain) {
            localStorage.setItem(`store_token_${subdomain}`, token);
            // Remove token from URL
            const newSearchParams = new URLSearchParams(searchParams);
            newSearchParams.delete('token');
            newSearchParams.delete('refreshToken');
            const cleanPath = location.pathname + (newSearchParams.toString() ? `?${newSearchParams.toString()}` : '');
            navigate(cleanPath, { replace: true });

            // Trigger checkAuth if needed (the Context might already handle it if we add a way to trigger it)
            // Or we just reload the page/context state which happens on storage change or mount
            window.location.reload();
        }
    }, [searchParams, subdomain, navigate, location.pathname]);

    useEffect(() => {
        const loadStore = async () => {
            try {
                const response = await storeApi.getBySubdomain(subdomain || undefined);
                if (response.success && response.data) {
                    setStore(response.data);
                }
            } catch (error) {
                console.error('Failed to load store:', error);
            } finally {
                setLoading(false);
            }
        };
        loadStore();
    }, [subdomain]);

    useEffect(() => {
        if (isAuthenticated && store) {
            // Logic to determine if profile is complete
            // 1. Name should exist
            // 2. Name should NOT be a placeholder (starts with "Customer " or is just the email prefix)
            const isPlaceholderName = customer?.name?.startsWith('Customer ') ||
                (customer?.email && customer.name === customer.email.split('@')[0]);

            if (customer?.name && !isPlaceholderName) {
                const redirectUrl = buildStorePath('/', store.subdomain);
                navigate(redirectUrl, { state: location.state });
            } else if (step !== 'NAME') {
                setStep('NAME');
            }
        }
    }, [isAuthenticated, store, navigate, redirectPath, location.state, customer, step]);

    const validatePhone = (p: string) => /^\d{10}$/.test(p);
    const validateEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

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

    const handleIdentifierSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!identifier || !subdomain) {
            toast.error('Please enter email or phone number');
            return;
        }

        const isEmail = identifier.includes('@');
        if (!isEmail && !validatePhone(identifier)) {
            toast.error('Please enter a valid email or 10-digit mobile number');
            return;
        }

        setIsLoadingAuth(true);
        try {
            const type = isEmail ? 'email' : 'phone';
            const res = await sendOtp(subdomain, type, identifier);
            if (res.success) {
                setEntryType(type);
                setExists(res.exists);
                setStep('VERIFY');
                toast.success(res.message);
            } else {
                toast.error(res.message || 'Failed to send OTP');
            }
        } catch (err) {
            toast.error('Error sending OTP');
        } finally {
            setIsLoadingAuth(false);
        }
    };

    const handleVerifySubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        const otpValue = otp.join('');
        if (otpValue.length < 6 || !subdomain || !entryType) {
            toast.error('Please enter the 6-digit code');
            return;
        }

        setIsLoadingAuth(true);
        try {
            const success = await verifyOtp(subdomain, entryType, identifier, otpValue);
            if (success) {
                if (exists) {
                    toast.success('Welcome back!');
                } else {
                    setStep('NAME');
                }
            }
        } catch (err) {
            toast.error('Verification failed');
        } finally {
            setIsLoadingAuth(false);
        }
    };

    const handleNameSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!name.trim() || !subdomain) {
            toast.error('Please enter your name');
            return;
        }

        setIsLoadingAuth(true);
        try {
            const success = await signupComplete(subdomain, name.trim());
            if (success) {
                toast.success('Account created successfully');
                const redirectUrl = buildStorePath('/', subdomain);
                navigate(redirectUrl, { state: location.state });
            }
        } catch (err) {
            toast.error('Failed to complete setup');
        } finally {
            setIsLoadingAuth(false);
        }
    };

    const handleGoogleSignIn = () => {
        if (!subdomain) return;
        const redirectUrl = buildStorePath(`/${redirectPath}`, subdomain);
        sessionStorage.setItem('storeAuthRedirect', redirectUrl);
        sessionStorage.setItem('storeAuthSubdomain', subdomain);
        window.location.href = `${API_BASE_URL}/api/auth/google`;
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-muted/30">Loading...</div>;
    }

    if (!store) {
        return <div className="min-h-screen flex items-center justify-center bg-muted/30">Store not found</div>;
    }

    const primaryColor = '#16a34a'; // Green

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
            <div className="w-full max-w-sm">
                <div className="text-center mb-10">
                    <Link to={buildStorePath('/', subdomain || undefined)}>
                        <h1 className="text-3xl font-bold mb-2 hover:text-green-600 transition-colors cursor-pointer">{store.storeName}</h1>
                    </Link>
                    <p className="text-muted-foreground">
                        {step === 'IDENTIFIER' ? (redirectPath === 'checkout' ? 'Sign in to continue shopping' : 'Sign in to your account') :
                            step === 'VERIFY' ? `Enter the code sent to ${identifier}` : 'Complete your profile'}
                    </p>
                </div>

                <div className="bg-card rounded-3xl shadow-2xl p-8 border border-gray-100">
                    <h2 className="text-2xl font-bold mb-8 text-gray-900 tracking-tight">
                        {step === 'IDENTIFIER' ? 'Sign-In or Create' : step === 'VERIFY' ? 'Verify Code' : 'Welcome!'}
                    </h2>

                    <div className="space-y-6">
                        {step === 'IDENTIFIER' && (
                            <form onSubmit={handleIdentifierSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="identifier" className="text-sm font-semibold text-gray-600 ml-1">Email or phone number</Label>
                                    <Input
                                        id="identifier"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        className="h-12 rounded-xl border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                        placeholder="Enter email or phone"
                                        required
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-green-600/20 transition-all"
                                    disabled={isLoadingAuth}
                                >
                                    {isLoadingAuth ? <Loader2 className="animate-spin h-5 w-5" /> : 'Continue'}
                                </Button>

                                <div className="relative my-4">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t border-gray-100"></span>
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-white px-2 text-gray-400 font-medium">Or</span>
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    type="button"
                                    className="w-full h-12 border-gray-200 rounded-xl hover:bg-gray-50 flex items-center justify-center gap-3 transition-all"
                                    onClick={handleGoogleSignIn}
                                    disabled={isLoadingAuth}
                                >
                                    <img src={googleLogo} alt="Google" className="h-5 w-5" />
                                    <span className="font-bold text-gray-700">Continue with Google</span>
                                </Button>
                            </form>
                        )}

                        {step === 'VERIFY' && (
                            <form onSubmit={handleVerifySubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center px-1">
                                        <Label htmlFor="otp-0" className="text-sm font-semibold text-gray-600">Verification Code</Label>
                                        <button
                                            type="button"
                                            onClick={() => setStep('IDENTIFIER')}
                                            className="text-xs font-bold text-green-600 hover:underline"
                                        >
                                            Change {entryType === 'email' ? 'Email' : 'Phone'}
                                        </button>
                                    </div>
                                    <div className="flex gap-2 justify-between">
                                        {otp.map((digit, i) => (
                                            <Input
                                                key={i}
                                                id={`otp-${i}`}
                                                maxLength={1}
                                                value={digit}
                                                onChange={(e) => handleOtpChange(i, e.target.value)}
                                                onKeyDown={(e) => handleOtpKeyDown(i, e)}
                                                className="text-center w-full h-12 text-lg font-bold rounded-xl border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500"
                                            />
                                        ))}
                                    </div>
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-green-600/20 transition-all"
                                    disabled={isLoadingAuth}
                                >
                                    {isLoadingAuth ? <Loader2 className="animate-spin h-5 w-5" /> : 'Verify'}
                                </Button>
                                <div className="text-center">
                                    <button
                                        type="button"
                                        onClick={handleIdentifierSubmit}
                                        className="text-sm font-medium text-green-600 hover:underline"
                                        disabled={isLoadingAuth}
                                    >
                                        Resend Code
                                    </button>
                                </div>
                            </form>
                        )}

                        {step === 'NAME' && (
                            <form onSubmit={handleNameSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <Label htmlFor="name" className="text-sm font-semibold text-gray-600 ml-1">Your Name</Label>
                                    <Input
                                        id="name"
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        className="h-12 rounded-xl border-gray-200 focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                                        placeholder="Enter your full name"
                                        required
                                    />
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-bold text-lg rounded-xl shadow-lg shadow-green-600/20 transition-all"
                                    disabled={isLoadingAuth}
                                >
                                    {isLoadingAuth ? <Loader2 className="animate-spin h-5 w-5" /> : 'Complete Setup'}
                                </Button>
                            </form>
                        )}
                    </div>

                    <p className="mt-8 text-[11px] text-gray-400 text-center leading-relaxed font-medium">
                        By continuing, you agree to comply with {store.storeName}'s terms and conditions.
                    </p>
                </div>

                <div className="text-center mt-8">
                    <Button
                        variant="link"
                        onClick={() => navigate(buildStorePath('/', subdomain))}
                        className="text-gray-500 hover:text-green-600 font-semibold"
                    >
                        Back to Store
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default StoreAuthPage;


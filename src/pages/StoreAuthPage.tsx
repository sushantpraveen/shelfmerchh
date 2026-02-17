import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useStoreAuth } from '@/contexts/StoreAuthContext';
import { storeApi } from '@/lib/api';
import { Store } from '@/types';
import { getTenantSlugFromLocation, buildStorePath } from '@/utils/tenantUtils';
import { PasswordInput } from '@/components/ui/PasswordInput';
import { validateName, validateEmail, validatePassword, passwordRules } from '@/utils/authValidation';
import { Check, X, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import googleLogo from '@/assets/google-logo-new.png';
import { API_BASE_URL } from '@/config';

const StoreAuthPage = () => {
    const params = useParams<{ subdomain: string }>();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { login, register, isAuthenticated } = useStoreAuth();

    // Get tenant slug from subdomain (hostname) or path parameter (fallback)
    const subdomain = getTenantSlugFromLocation(location, params) || params.subdomain;

    const [store, setStore] = useState<Store | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'login' | 'signup'>('login');
    const [isLoadingAuth, setIsLoadingAuth] = useState(false);

    // Form states
    const [loginEmail, setLoginEmail] = useState('');
    const [loginPassword, setLoginPassword] = useState('');
    const [signupName, setSignupName] = useState('');
    const [signupEmail, setSignupEmail] = useState('');
    const [signupPassword, setSignupPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    // Validation states
    const [nameError, setNameError] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordErrors, setPasswordErrors] = useState<string[]>([]);
    const [confirmPasswordError, setConfirmPasswordError] = useState('');

    const redirectPath = searchParams.get('redirect') || '';

    useEffect(() => {
        const loadStore = async () => {
            try {
                const response = await storeApi.getBySubdomain(subdomain || undefined);
                if (response.success && response.data) {
                    setStore(response.data);
                } else {
                    setStore(null);
                }
            } catch (error) {
                console.error('Failed to load store:', error);
                setStore(null);
            } finally {
                setLoading(false);
            }
        };
        loadStore();
    }, [subdomain]);

    useEffect(() => {
        if (isAuthenticated && store) {
            const redirectUrl = buildStorePath(`/${redirectPath}`, store.subdomain);
            navigate(redirectUrl, { state: location.state });
        }
    }, [isAuthenticated, store, navigate, redirectPath, location.state]);

    // Handle name input (prevent invalid characters)
    const handleNameChange = (value: string) => {
        const filtered = value.replace(/[^A-Za-z\s]/g, '');
        setSignupName(filtered);
        if (filtered !== value) {
            const trimmed = filtered.replace(/\s+/g, ' ').trim();
            setSignupName(trimmed);
            setNameError(validateName(trimmed));
        } else {
            setNameError('');
        }
    };

    // Handle name blur
    const handleNameBlur = () => {
        const trimmed = signupName.trim().replace(/\s+/g, ' ');
        setSignupName(trimmed);
        setNameError(validateName(trimmed));
    };

    // Handle email change
    const handleEmailChange = (value: string, isSignup: boolean) => {
        if (isSignup) {
            setSignupEmail(value);
        } else {
            setLoginEmail(value);
        }
        setEmailError('');
    };

    // Handle email blur
    const handleEmailBlur = (email: string, isSignup: boolean) => {
        const error = validateEmail(email);
        setEmailError(error);
    };

    // Handle password change with live validation
    const handlePasswordChange = (value: string, isSignup: boolean) => {
        if (isSignup) {
            setSignupPassword(value);
            const errors = validatePassword(value);
            setPasswordErrors(errors);
            // Clear confirm password error if passwords match
            if (confirmPassword && value === confirmPassword) {
                setConfirmPasswordError('');
            }
        } else {
            setLoginPassword(value);
        }
    };

    // Handle confirm password change
    const handleConfirmPasswordChange = (value: string) => {
        setConfirmPassword(value);
        if (value && signupPassword && value !== signupPassword) {
            setConfirmPasswordError('Passwords do not match');
        } else {
            setConfirmPasswordError('');
        }
    };

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!subdomain) return;

        setIsLoadingAuth(true);
        const emailErr = validateEmail(loginEmail);
        if (emailErr) {
            setEmailError(emailErr);
            setIsLoadingAuth(false);
            return;
        }

        const success = await login(subdomain, loginEmail.trim(), loginPassword);
        setIsLoadingAuth(false);
        // Navigation handled by useEffect
    };

    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!subdomain) return;

        setIsLoadingAuth(true);

        // Validate all fields
        const nameErr = validateName(signupName);
        const emailErr = validateEmail(signupEmail);
        const pwdErrors = validatePassword(signupPassword);

        setNameError(nameErr);
        setEmailError(emailErr);
        setPasswordErrors(pwdErrors);

        if (signupPassword !== confirmPassword) {
            setConfirmPasswordError('Passwords do not match');
        }

        if (nameErr || emailErr || pwdErrors.length > 0 || signupPassword !== confirmPassword) {
            setIsLoadingAuth(false);
            return;
        }

        const success = await register(subdomain, signupName.trim(), signupEmail.trim(), signupPassword);
        setIsLoadingAuth(false);
        // Navigation handled by useEffect
    };

    // Handle Google sign-in
    const handleGoogleSignIn = () => {
        if (!subdomain) return;
        // For now, use main Google auth - backend can be updated later to support store-specific Google auth
        // Store the redirect path in sessionStorage to restore after Google auth
        const redirectUrl = buildStorePath(`/${redirectPath}`, subdomain);
        sessionStorage.setItem('storeAuthRedirect', redirectUrl);
        sessionStorage.setItem('storeAuthSubdomain', subdomain);
        window.location.href = `${API_BASE_URL}/api/auth/google`;
    };

    // Render password rules checklist
    const renderPasswordRules = (password: string, errors: string[]) => {
        return (
            <div className="mt-2 space-y-1">
                {passwordRules.map((rule, index) => {
                    const passed = rule.test(password);
                    return (
                        <div key={index} className="flex items-center gap-2 text-sm">
                            {passed ? (
                                <Check className="h-4 w-4 text-green-600" />
                            ) : (
                                <X className="h-4 w-4 text-red-600" />
                            )}
                            <span className={passed ? 'text-green-700' : 'text-red-700'}>
                                {rule.label}
                            </span>
                        </div>
                    );
                })}
            </div>
        );
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center bg-muted/30">Loading...</div>;
    }

    if (!store) {
        return <div className="min-h-screen flex items-center justify-center bg-muted/30">Store not found</div>;
    }

    // Use black and green color scheme
    const primaryColor = '#16a34a'; // Green

    return (
        <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold mb-2" style={{ color: '#000000' }}>{store.storeName}</h1>
                    <p className="text-muted-foreground">
                        {redirectPath === 'checkout' ? 'Sign in to continue to checkout' : 'Sign in to your account'}
                    </p>
                </div>

                <div className="bg-card rounded-lg shadow-card p-6">
                    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'login' | 'signup')} className="w-full">
                        <TabsList className="grid w-full grid-cols-2 mb-6">
                            <TabsTrigger value="login">Log in</TabsTrigger>
                            <TabsTrigger value="signup">Sign up</TabsTrigger>
                        </TabsList>

                        <TabsContent value="login">
                            <form onSubmit={handleLogin} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="login-email">Email</Label>
                                    <Input
                                        id="login-email"
                                        type="email"
                                        value={loginEmail}
                                        onChange={(e) => handleEmailChange(e.target.value, false)}
                                        onBlur={() => handleEmailBlur(loginEmail, false)}
                                        placeholder="you@example.com"
                                        required
                                    />
                                    {emailError && (
                                        <p className="text-sm text-red-600">{emailError}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="login-password">Password</Label>
                                    <PasswordInput
                                        id="login-password"
                                        value={loginPassword}
                                        onChange={(e) => handlePasswordChange(e.target.value, false)}
                                        placeholder="••••••••"
                                        required
                                    />
                                </div>
                                <div className="text-right">
                                    <button
                                        type="button"
                                        className="text-sm text-primary hover:underline"
                                        style={{ color: primaryColor }}
                                    >
                                        Forgot password?
                                    </button>
                                </div>
                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isLoadingAuth}
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {isLoadingAuth ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Logging in...
                                        </>
                                    ) : (
                                        'Log in'
                                    )}
                                </Button>

                                <div className="relative my-4">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    type="button"
                                    className="w-full"
                                    onClick={handleGoogleSignIn}
                                >
                                    <img src={googleLogo} alt="Google" className="mr-2 h-5 w-5" />
                                    Google
                                </Button>
                            </form>
                        </TabsContent>

                        <TabsContent value="signup">
                            <form onSubmit={handleRegister} className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="signup-name">Name</Label>
                                    <Input
                                        id="signup-name"
                                        type="text"
                                        value={signupName}
                                        onChange={(e) => handleNameChange(e.target.value)}
                                        onBlur={handleNameBlur}
                                        placeholder="John Doe"
                                        required
                                    />
                                    {nameError && (
                                        <p className="text-sm text-red-600">{nameError}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signup-email">Email</Label>
                                    <Input
                                        id="signup-email"
                                        type="email"
                                        value={signupEmail}
                                        onChange={(e) => handleEmailChange(e.target.value, true)}
                                        onBlur={() => handleEmailBlur(signupEmail, true)}
                                        placeholder="you@example.com"
                                        required
                                    />
                                    {emailError && (
                                        <p className="text-sm text-red-600">{emailError}</p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signup-password">Password</Label>
                                    <PasswordInput
                                        id="signup-password"
                                        value={signupPassword}
                                        onChange={(e) => handlePasswordChange(e.target.value, true)}
                                        placeholder="••••••••"
                                        required
                                    />
                                    {signupPassword && renderPasswordRules(signupPassword, passwordErrors)}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="signup-confirm-password">Confirm Password</Label>
                                    <PasswordInput
                                        id="signup-confirm-password"
                                        value={confirmPassword}
                                        onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                                        placeholder="••••••••"
                                        required
                                    />
                                    {confirmPasswordError && (
                                        <p className="text-sm text-red-600">{confirmPasswordError}</p>
                                    )}
                                </div>

                                <Button
                                    type="submit"
                                    className="w-full"
                                    disabled={isLoadingAuth}
                                    style={{ backgroundColor: primaryColor }}
                                >
                                    {isLoadingAuth ? (
                                        <>
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                            Creating account...
                                        </>
                                    ) : (
                                        'Sign up for Free'
                                    )}
                                </Button>

                                <div className="relative my-4">
                                    <div className="absolute inset-0 flex items-center">
                                        <span className="w-full border-t" />
                                    </div>
                                    <div className="relative flex justify-center text-xs uppercase">
                                        <span className="bg-card px-2 text-muted-foreground">Or continue with</span>
                                    </div>
                                </div>

                                <Button
                                    variant="outline"
                                    type="button"
                                    className="w-full"
                                    onClick={handleGoogleSignIn}
                                >
                                    <img src={googleLogo} alt="Google" className="mr-2 h-5 w-5" />
                                    Google
                                </Button>
                            </form>
                        </TabsContent>
                    </Tabs>
                </div>

                <div className="text-center mt-6">
                    <Button
                        variant="link"
                        onClick={() => {
                            const homePath = buildStorePath('/', store.subdomain);
                            navigate(homePath);
                        }}
                        className="text-black hover:text-green-600"
                    >
                        Return to Store
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default StoreAuthPage;

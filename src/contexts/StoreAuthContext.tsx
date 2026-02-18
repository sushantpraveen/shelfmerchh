import React, { createContext, useContext, useState, useEffect } from 'react';
import { toast } from 'sonner';
import { API_BASE_URL } from '@/config';

export interface StoreCustomerAddress {
    _id: string;
    fullName: string;
    address1: string;
    address2?: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
    phone: string;
    isDefault: boolean;
    label?: string;
}

export interface StoreCustomer {
    id: string;
    name: string;
    email: string;
    phoneNumber?: string;
    storeId?: string;
    isEmailVerified?: boolean;
    isPhoneVerified?: boolean;
    addresses?: StoreCustomerAddress[];
    notificationPreferences?: {
        orderUpdates: boolean;
        marketingEmails: boolean;
    };
}

interface StoreAuthContextType {
    customer: StoreCustomer | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (subdomain: string, email: string, password: string) => Promise<boolean>;
    register: (subdomain: string, name: string, email: string, password: string) => Promise<boolean>;
    sendOtp: (subdomain: string, otpType: 'email' | 'phone', identifier: string) => Promise<{ success: boolean; exists: boolean; message: string }>;
    verifyOtp: (subdomain: string, otpType: 'email' | 'phone', identifier: string, otp: string) => Promise<boolean>;
    signupComplete: (subdomain: string, name: string) => Promise<boolean>;
    logout: (subdomain: string) => void;
    checkAuth: (subdomain: string) => Promise<void>;
    requestPasswordResetOTP: (subdomain: string, email: string) => Promise<boolean>;
    verifyPasswordResetOTP: (subdomain: string, email: string, otp: string) => Promise<boolean>;
    resetPassword: (subdomain: string, email: string, otp: string, newPassword: string) => Promise<boolean>;
    updateProfile: (subdomain: string, data: Partial<StoreCustomer>) => Promise<boolean>;
    fetchAddresses: (subdomain: string) => Promise<StoreCustomerAddress[]>;
    addAddress: (subdomain: string, address: Omit<StoreCustomerAddress, '_id'>) => Promise<boolean>;
    updateAddress: (subdomain: string, addressId: string, address: Partial<StoreCustomerAddress>) => Promise<boolean>;
    deleteAddress: (subdomain: string, addressId: string) => Promise<boolean>;
    sendPhoneVerificationOtp: (subdomain: string, phoneNumber: string) => Promise<boolean>;
    confirmPhoneVerificationOtp: (subdomain: string, otp: string) => Promise<boolean>;
    updateNotifications: (subdomain: string, prefs: { orderUpdates?: boolean; marketingEmails?: boolean }) => Promise<boolean>;
    deleteAccount: (subdomain: string) => Promise<boolean>;
}

const StoreAuthContext = createContext<StoreAuthContextType | undefined>(undefined);

export const StoreAuthProvider: React.FC<{ children: React.ReactNode; subdomain?: string }> = ({ children, subdomain: propSubdomain }) => {
    const [customer, setCustomer] = useState<StoreCustomer | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const API_BASE = API_BASE_URL;

    const checkAuth = async (subdomainOverride?: string) => {
        const subdomain = subdomainOverride || propSubdomain;
        if (!subdomain) {
            setIsLoading(false);
            return;
        }

        const token = localStorage.getItem(`store_token_${subdomain}`);

        if (!token) {
            setCustomer(null);
            setIsLoading(false);
            return;
        }

        try {
            const resp = await fetch(`${API_BASE}/store-auth/me`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                setCustomer(data.customer);
            } else {
                localStorage.removeItem(`store_token_${subdomain}`);
                setCustomer(null);
            }
        } catch (err) {
            console.error('Auth check failed', err);
        } finally {
            setIsLoading(false);
        }
    };

    // Auto-check auth on mount or subdomain change
    useEffect(() => {
        checkAuth();
    }, [propSubdomain]);

    const sendOtp = async (subdomain: string, otpType: 'email' | 'phone', identifier: string) => {
        try {
            const body: any = { subdomain, otpType };
            if (otpType === 'email') body.email = identifier;
            else body.phoneNumber = identifier;

            const resp = await fetch(`${API_BASE}/store-auth/otp/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await resp.json();
            return {
                success: resp.ok && data.success,
                exists: data.exists,
                message: data.message
            };
        } catch (err) {
            console.error('Send OTP error', err);
            return { success: false, exists: false, message: 'Failed to send OTP' };
        }
    };

    const verifyOtp = async (subdomain: string, otpType: 'email' | 'phone', identifier: string, otp: string) => {
        try {
            const body: any = { subdomain, otpType, otp };
            if (otpType === 'email') body.email = identifier;
            else body.phoneNumber = identifier;

            const resp = await fetch(`${API_BASE}/store-auth/otp/verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            const data = await resp.json();

            if (resp.ok && data.success) {
                localStorage.setItem(`store_token_${subdomain}`, data.token);
                setCustomer(data.customer);
                return true;
            } else {
                toast.error(data.message || 'Invalid code');
                return false;
            }
        } catch (err) {
            console.error('Verify OTP error', err);
            toast.error('Verification failed');
            return false;
        }
    };

    const signupComplete = async (subdomain: string, name: string) => {
        try {
            const token = localStorage.getItem(`store_token_${subdomain}`);
            const resp = await fetch(`${API_BASE}/store-auth/signup/complete`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name }),
            });
            const data = await resp.json();

            if (resp.ok && data.success) {
                setCustomer(data.customer);
                return true;
            } else {
                toast.error(data.message || 'Failed to complete signup');
                return false;
            }
        } catch (err) {
            console.error('Signup complete error', err);
            toast.error('Signup completion failed');
            return false;
        }
    };

    const login = async (subdomain: string, email: string, password: string): Promise<boolean> => {
        try {
            const resp = await fetch(`${API_BASE}/store-auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subdomain, email, password }),
            });
            const data = await resp.json();

            if (resp.ok && data.success) {
                localStorage.setItem(`store_token_${subdomain}`, data.token);
                setCustomer(data.customer);
                toast.success('Logged in successfully');
                return true;
            } else {
                toast.error(data.message || 'Login failed');
                return false;
            }
        } catch (err) {
            console.error('Login error', err);
            toast.error('Login failed. Please try again.');
            return false;
        }
    };

    const register = async (subdomain: string, name: string, email: string, password: string): Promise<boolean> => {
        try {
            const resp = await fetch(`${API_BASE}/store-auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subdomain, name, email, password }),
            });
            const data = await resp.json();

            if (resp.ok && data.success) {
                localStorage.setItem(`store_token_${subdomain}`, data.token);
                setCustomer(data.customer);
                toast.success('Account created successfully');
                return true;
            } else {
                toast.error(data.message || 'Registration failed');
                return false;
            }
        } catch (err) {
            console.error('Registration error', err);
            toast.error('Registration failed. Please try again.');
            return false;
        }
    };

    const logout = (subdomain: string) => {
        localStorage.removeItem(`store_token_${subdomain}`);
        setCustomer(null);
        toast.success('Logged out');
    };

    const requestPasswordResetOTP = async (subdomain: string, email: string): Promise<boolean> => {
        try {
            const resp = await fetch(`${API_BASE}/store-auth/forgot-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subdomain, email }),
            });
            const data = await resp.json();

            if (resp.ok && data.success) {
                toast.success(data.message || 'We\'ve sent a verification code to your email.');
                return true;
            } else {
                toast.error(data.message || 'Failed to send verification code');
                return false;
            }
        } catch (err) {
            console.error('Request password reset OTP error', err);
            toast.error('Failed to send verification code. Please try again.');
            return false;
        }
    };

    const verifyPasswordResetOTP = async (subdomain: string, email: string, otp: string): Promise<boolean> => {
        try {
            const resp = await fetch(`${API_BASE}/store-auth/verify-reset-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subdomain, email, otp }),
            });
            const data = await resp.json();

            if (resp.ok && data.success) {
                return true;
            } else {
                toast.error(data.message || 'Invalid or expired verification code');
                return false;
            }
        } catch (err) {
            console.error('Verify password reset OTP error', err);
            toast.error('Failed to verify code. Please try again.');
            return false;
        }
    };

    const resetPassword = async (subdomain: string, email: string, otp: string, newPassword: string): Promise<boolean> => {
        try {
            const resp = await fetch(`${API_BASE}/store-auth/reset-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ subdomain, email, otp, newPassword }),
            });
            const data = await resp.json();

            if (resp.ok && data.success) {
                toast.success('Password updated successfully. Please login.');
                return true;
            } else {
                toast.error(data.message || 'Failed to reset password');
                return false;
            }
        } catch (err) {
            console.error('Reset password error', err);
            toast.error('Failed to reset password. Please try again.');
            return false;
        }
    };

    const updateProfile = async (subdomain: string, data: Partial<StoreCustomer>): Promise<boolean> => {
        try {
            const token = localStorage.getItem(`store_token_${subdomain}`);
            const resp = await fetch(`${API_BASE}/store-auth/me`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(data),
            });
            const result = await resp.json();
            if (resp.ok && result.success) {
                setCustomer(result.customer);
                toast.success('Profile updated successfully');
                return true;
            } else {
                toast.error(result.message || 'Failed to update profile');
                return false;
            }
        } catch (err) {
            console.error('Update profile error', err);
            toast.error('Failed to update profile');
            return false;
        }
    };

    const fetchAddresses = async (subdomain: string): Promise<StoreCustomerAddress[]> => {
        try {
            const token = localStorage.getItem(`store_token_${subdomain}`);
            const resp = await fetch(`${API_BASE}/store-auth/addresses`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await resp.json();
            if (resp.ok && data.success) return data.data;
            return [];
        } catch (err) {
            console.error('Fetch addresses error', err);
            return [];
        }
    };

    const addAddress = async (subdomain: string, address: Omit<StoreCustomerAddress, '_id'>): Promise<boolean> => {
        try {
            const token = localStorage.getItem(`store_token_${subdomain}`);
            const resp = await fetch(`${API_BASE}/store-auth/addresses`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(address),
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                // Refresh customer to get updated addresses
                await checkAuth(subdomain);
                toast.success('Address added successfully');
                return true;
            } else {
                toast.error(data.message || 'Failed to add address');
                return false;
            }
        } catch (err) {
            console.error('Add address error', err);
            toast.error('Failed to add address');
            return false;
        }
    };

    const updateAddress = async (subdomain: string, addressId: string, address: Partial<StoreCustomerAddress>): Promise<boolean> => {
        try {
            const token = localStorage.getItem(`store_token_${subdomain}`);
            const resp = await fetch(`${API_BASE}/store-auth/addresses/${addressId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(address),
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                await checkAuth(subdomain);
                toast.success('Address updated successfully');
                return true;
            } else {
                toast.error(data.message || 'Failed to update address');
                return false;
            }
        } catch (err) {
            console.error('Update address error', err);
            toast.error('Failed to update address');
            return false;
        }
    };

    const deleteAddress = async (subdomain: string, addressId: string): Promise<boolean> => {
        try {
            const token = localStorage.getItem(`store_token_${subdomain}`);
            const resp = await fetch(`${API_BASE}/store-auth/addresses/${addressId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                await checkAuth(subdomain);
                toast.success('Address deleted');
                return true;
            } else {
                toast.error(data.message || 'Failed to delete address');
                return false;
            }
        } catch (err) {
            console.error('Delete address error', err);
            toast.error('Failed to delete address');
            return false;
        }
    };

    const sendPhoneVerificationOtp = async (subdomain: string, phoneNumber: string): Promise<boolean> => {
        try {
            const token = localStorage.getItem(`store_token_${subdomain}`);
            const resp = await fetch(`${API_BASE}/store-auth/verify-phone/send`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ phoneNumber }),
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                toast.success('Verification code sent');
                return true;
            } else {
                toast.error(data.message || 'Failed to send verification code');
                return false;
            }
        } catch (err) {
            console.error('Send phone verification error', err);
            return false;
        }
    };

    const confirmPhoneVerificationOtp = async (subdomain: string, otp: string): Promise<boolean> => {
        try {
            const token = localStorage.getItem(`store_token_${subdomain}`);
            const resp = await fetch(`${API_BASE}/store-auth/verify-phone/confirm`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ otp }),
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                setCustomer(data.customer);
                toast.success('Phone verified successfully');
                return true;
            } else {
                toast.error(data.message || 'Invalid verification code');
                return false;
            }
        } catch (err) {
            console.error('Confirm phone verification error', err);
            return false;
        }
    };

    const updateNotifications = async (subdomain: string, prefs: { orderUpdates?: boolean; marketingEmails?: boolean }): Promise<boolean> => {
        try {
            const token = localStorage.getItem(`store_token_${subdomain}`);
            const resp = await fetch(`${API_BASE}/store-auth/notifications`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(prefs),
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                await checkAuth(subdomain);
                toast.success('Notification preferences updated');
                return true;
            } else {
                toast.error(data.message || 'Failed to update preferences');
                return false;
            }
        } catch (err) {
            console.error('Update notifications error', err);
            return false;
        }
    };

    const deleteAccount = async (subdomain: string): Promise<boolean> => {
        try {
            const token = localStorage.getItem(`store_token_${subdomain}`);
            const resp = await fetch(`${API_BASE}/store-auth/account`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await resp.json();
            if (resp.ok && data.success) {
                logout(subdomain);
                toast.success('Account deleted successfully');
                return true;
            } else {
                toast.error(data.message || 'Failed to delete account');
                return false;
            }
        } catch (err) {
            console.error('Delete account error', err);
            return false;
        }
    };

    return (
        <StoreAuthContext.Provider value={{
            customer,
            isAuthenticated: !!customer,
            isLoading,
            login,
            register,
            logout,
            checkAuth,
            requestPasswordResetOTP,
            verifyPasswordResetOTP,
            resetPassword,
            sendOtp,
            verifyOtp,
            signupComplete,
            updateProfile,
            fetchAddresses,
            addAddress,
            updateAddress,
            deleteAddress,
            sendPhoneVerificationOtp,
            confirmPhoneVerificationOtp,
            updateNotifications,
            deleteAccount
        }}>
            {children}
        </StoreAuthContext.Provider>
    );
};

export const useStoreAuth = () => {
    const context = useContext(StoreAuthContext);
    if (context === undefined) {
        throw new Error('useStoreAuth must be used within a StoreAuthProvider');
    }
    return context;
};

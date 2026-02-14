import React, { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi, ApiError } from '@/lib/api';

export type UserRole = 'superadmin' | 'merchant' | 'user';

export interface User {
  id: string;
  email: string;
  phone?: string;
  name: string;
  role: UserRole;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  createdAt: string;
  lastLogin?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  loginWithOtp: (identifier: string, otp: string, serverOtp?: string) => Promise<void>;
  signupComplete: (data: { name: string, phone?: string, email?: string, password?: string, otp?: string, serverOtp?: string }) => Promise<void>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  isMerchant: boolean;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check for existing session on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await authApi.getMe();
          if (response.success && response.user) {
            setUser({
              id: response.user.id,
              email: response.user.email,
              phone: response.user.phone,
              name: response.user.name,
              role: response.user.role as UserRole,
              isEmailVerified: response.user.isEmailVerified || false,
              isPhoneVerified: response.user.isPhoneVerified || false,
              createdAt: response.user.createdAt,
              lastLogin: response.user.lastLogin,
            });
          }
        }
      } catch (error: any) {
        console.error('Auth check failed:', error);
        // Only clear tokens if it's a real auth error (401), not network errors
        if (error?.status === 401 || error?.response?.status === 401) {
          localStorage.removeItem('token');
          localStorage.removeItem('refreshToken');
        }
        // Don't clear tokens on network errors - user might still be authenticated
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login(email, password);
      if (response.success && response.user) {
        setUser({
          id: response.user.id,
          email: response.user.email,
          phone: response.user.phone,
          name: response.user.name,
          role: response.user.role as UserRole,
          isEmailVerified: response.user.isEmailVerified || false,
          isPhoneVerified: response.user.isPhoneVerified || false,
          createdAt: response.user.createdAt,
        });
      } else {
        throw new Error('Login failed');
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new Error('Failed to login. Please try again.');
    }
  };

  const signup = async (email: string, password: string, name: string) => {
    try {
      const response = await authApi.register(name, email, password);
      if (response.success) {
        // Don't set user or token - user needs to verify email first
        // The response will have a message about checking email
        return;
      } else {
        throw new Error(response.message || 'Registration failed');
      }
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw new Error('Failed to register. Please try again.');
    }
  };

  const loginWithOtp = async (identifier: string, otp: string, serverOtp?: string) => {
    try {
      const response = await authApi.verifyLoginOtp(identifier, otp, serverOtp);
      if (response.success && response.user) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('refreshToken', response.refreshToken);
        setUser({
          id: response.user.id,
          email: response.user.email,
          phone: response.user.phone,
          name: response.user.name,
          role: response.user.role as UserRole,
          isEmailVerified: response.user.isEmailVerified || false,
          isPhoneVerified: response.user.isPhoneVerified || false,
          createdAt: response.user.createdAt,
        });
      } else {
        throw new Error('Verification failed');
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to verify OTP. Please try again.');
    }
  };

  const signupComplete = async (data: { name: string, phone?: string, email?: string, password?: string, otp?: string, serverOtp?: string }) => {
    try {
      const response = await authApi.completeSignupOtp(data);
      if (response.success && response.user) {
        localStorage.setItem('token', response.token);
        localStorage.setItem('refreshToken', response.refreshToken);
        setUser({
          id: response.user.id,
          email: response.user.email,
          phone: response.user.phone,
          name: response.user.name,
          role: response.user.role as UserRole,
          isEmailVerified: response.user.isEmailVerified || false,
          isPhoneVerified: response.user.isPhoneVerified || false,
          createdAt: response.user.createdAt,
        });
      } else {
        throw new Error('Account creation failed');
      }
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new Error('Failed to create account. Please try again.');
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      localStorage.removeItem('token');
      localStorage.removeItem('refreshToken');
      setUser(null);
      navigate('/');
    }
  };

  const refreshUser = async () => {
    try {
      const response = await authApi.getMe();
      if (response.success && response.user) {
        setUser({
          id: response.user.id,
          email: response.user.email,
          phone: response.user.phone,
          name: response.user.name,
          role: response.user.role as UserRole,
          isEmailVerified: response.user.isEmailVerified || false,
          isPhoneVerified: response.user.isPhoneVerified || false,
          createdAt: response.user.createdAt,
          lastLogin: response.user.lastLogin,
        });
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        signup,
        loginWithOtp,
        signupComplete,
        logout,
        isAdmin: user?.role === 'superadmin',
        isMerchant: user?.role === 'merchant' || user?.role === 'superadmin',
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

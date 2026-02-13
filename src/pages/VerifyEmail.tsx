import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { API_BASE_URL } from '@/config';

const VerifyEmail = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setMessage('Invalid verification token');
        setTimeout(() => {
          navigate('/auth?error=invalid_token');
        }, 3000);
        return;
      }

      try {
        // Call backend API to verify email
        const response = await fetch(`${API_BASE_URL}/auth/verify-email?token=${token}`, {
          method: 'GET',
          credentials: 'include',
        });

        const data = await response.json();

        if (response.ok && data.success) {
          setStatus('success');
          setMessage('Email verified successfully! Redirecting to login...');
          setTimeout(() => {
            navigate('/auth?verified=true');
          }, 2000);
        } else {
          setStatus('error');
          setMessage(data.message || 'Verification failed. The token may be invalid or expired.');
          setTimeout(() => {
            const errorParam = data.error || 'verification_failed';
            navigate(`/auth?error=${errorParam}`);
          }, 3000);
        }
      } catch (error) {
        console.error('Verification error:', error);
        setStatus('error');
        setMessage('An error occurred during verification. Please try again.');
        setTimeout(() => {
          navigate('/auth?error=verification_failed');
        }, 3000);
      }
    };

    verifyEmail();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md">
        <div className="bg-card rounded-lg shadow-card p-8 text-center">
          {status === 'loading' && (
            <>
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2">Verifying your email...</h2>
              <p className="text-muted-foreground">Please wait while we verify your email address.</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-green-600">Email Verified!</h2>
              <p className="text-muted-foreground mb-4">{message}</p>
              <Alert className="border-green-500 bg-green-50">
                <AlertDescription className="text-green-800">
                  Your email has been successfully verified. You can now log in to your account.
                </AlertDescription>
              </Alert>
            </>
          )}

          {status === 'error' && (
            <>
              <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold mb-2 text-red-600">Verification Failed</h2>
              <p className="text-muted-foreground mb-4">{message}</p>
              <Alert className="border-red-500 bg-red-50 mb-4">
                <AlertDescription className="text-red-800">
                  {message || 'The verification link is invalid or has expired. Please request a new verification email.'}
                </AlertDescription>
              </Alert>
              <Button onClick={() => navigate('/auth')} variant="outline">
                Go to Login
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;


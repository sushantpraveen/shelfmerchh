import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
  requireMerchant?: boolean;
}

export const ProtectedRoute = ({
  children,
  requireAdmin = false,
  requireMerchant = false
}: ProtectedRouteProps) => {
  const { isAuthenticated, isAdmin, isMerchant, isLoading } = useAuth();
  const location = useLocation();

  // Wait for auth state to finish loading before redirecting
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  if (requireMerchant && !isMerchant) {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
};

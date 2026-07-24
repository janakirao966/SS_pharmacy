import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface ProtectedRouteProps {
  children?: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#F9F8F3]" aria-live="polite">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-3 border-[#1D3A28]/20 border-t-[#C5A059] rounded-full animate-spin" />
          <span className="text-xs font-semibold text-[#1D3A28]/80 font-sans tracking-wide">
            Verifying Credentials...
          </span>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    console.warn('Unauthorized access blocked. Redirecting to login.');
    return <Navigate to="/admin/login" replace />;
  }

  return children ? <>{children}</> : <Outlet />;
}

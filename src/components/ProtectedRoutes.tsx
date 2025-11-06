// src/components/ProtectedRoutes.tsx

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';


const ProtectedRoutes = () => {
  const { user, loading, bootChecked, authDisabled } = useAuth();
  // Hold routing until both auth state and boot check resolve (prevents landing on /home after restart)
  if (authDisabled) {
    // Dev fallback: when Firebase is not configured, allow access
    return <Outlet />;
  }
  if (loading || !bootChecked) return <div className="min-h-screen flex items-center justify-center text-gray-600">Loading authentication...</div>;
  if (!user) return <Navigate to="/signin" replace />;
  return <Outlet />;
};

export default ProtectedRoutes;

// src/components/ProtectedRoutes.tsx

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoutes = () => {
  const { user, loading, bootChecked, authDisabled, guestMode } = useAuth();
  
  // Dev fallback: when Firebase is not configured, allow access
  if (authDisabled) {
    return <Outlet />;
  }
  
  // Hold routing until both auth state and boot check resolve
  if (loading || !bootChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-600">
        Loading authentication...
      </div>
    );
  }
  
  // Allow access if user is signed in OR in guest mode
  if (user || guestMode) {
    return <Outlet />;
  }
  
  // Otherwise redirect to sign-in
  return <Navigate to="/signin" replace />;
};

export default ProtectedRoutes;

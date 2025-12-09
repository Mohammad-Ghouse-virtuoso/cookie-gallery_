// src/components/ProtectedRoutes.tsx

import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Check if user is in guest mode (set via SignIn page "Continue as Guest" button)
const isGuestMode = (): boolean => {
  try {
    return sessionStorage.getItem('cg_guest_mode') === 'true';
  } catch {
    return false;
  }
};

// Export for use in SignIn page
export const setGuestMode = (enabled: boolean): void => {
  try {
    if (enabled) {
      sessionStorage.setItem('cg_guest_mode', 'true');
    } else {
      sessionStorage.removeItem('cg_guest_mode');
    }
  } catch {
    // Ignore storage errors
  }
};

export const clearGuestMode = (): void => {
  setGuestMode(false);
};

const ProtectedRoutes = () => {
  const { user, loading, bootChecked, authDisabled } = useAuth();
  
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
  if (user || isGuestMode()) {
    return <Outlet />;
  }
  
  // Otherwise redirect to sign-in
  return <Navigate to="/signin" replace />;
};

export default ProtectedRoutes;

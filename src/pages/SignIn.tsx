// src/pages/SignIn.tsx

import { useState, useEffect, useRef } from 'react';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithRedirect,
  getRedirectResult,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  signInWithPopup,
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// IMPORTANT: Assume you have a file at this path.
import googleLogoUrl from '../assets/google-icon.svg';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier | null;
    confirmationResult?: any;
  }
}

export default function SignIn() {
  const { user, loading } = useAuth();
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [authLoading, setAuthLoading] = useState(false);

  const recaptchaContainerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  const [authInstance] = useState(() => getAuth());

  // If already signed in, redirect away from /signin to home
  useEffect(() => {
    if (!loading && user) {
      console.log('SignIn: user already signed in, redirecting to /home');
      navigate('/home', { replace: true });
    }
  }, [user, loading, navigate]);

  // Handle redirect result (Google sign-in) on page load
  useEffect(() => {
    (async () => {
      try {
        const result = await getRedirectResult(authInstance);
        if (result && result.user) {
          console.log('SignIn: getRedirectResult returned user, redirecting to /home');
          setMessage('Successfully signed in with Google!');
          navigate('/home', { replace: true });
        } else {
          console.log('SignIn: getRedirectResult returned no user');
        }
      } catch (e: any) {
        setMessage(`Google Sign-In failed: ${e.message}`);
      }
    })();
  }, [authInstance, navigate]);

  // Removed auto-trigger for Google sign-in to allow manual user interaction
  // Users must click the button to initiate sign-in



  // IMPORTANT: The redirect logic is handled by ProtectedRoutes, so SignIn doesn't need its own redirect.
  // The user is already redirected to /home by the ProtectedRoutes component after successful sign-in.


  const handleGoogleSignIn = async () => {
    setAuthLoading(true);
    setMessage('');
    try {
      const auth = authInstance || getAuth();
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      try {
        console.log('SignIn: attempting signInWithPopup');
        const result = await signInWithPopup(auth, provider);
        console.log('SignIn: signInWithPopup success for uid:', result.user?.uid);
        navigate('/home', { replace: true });
        return;
      } catch (popupErr: any) {
        console.warn('SignIn: signInWithPopup failed, falling back to redirect', popupErr?.code || popupErr?.message);
        await signInWithRedirect(auth, provider);
        return;
      }
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        setMessage('Google Sign-In cancelled.');
      } else if (error.code === 'auth/cancelled-popup-request') {
        setMessage('Google Sign-In already in progress.');
      } else {
        setMessage(`Google Sign-In failed: ${error.message}`);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSendOtp = async () => {
    setAuthLoading(true);
    setMessage('');
    try {
      if (!authInstance) throw new Error("Firebase Auth not initialized.");
      if (!phoneNumber) {
        setMessage("Please enter a phone number.");
        setAuthLoading(false);
        return;
      }
      if (!recaptchaContainerRef.current) {
        setMessage("reCAPTCHA container not found. Ensure the div with id='recaptcha-container' is in your index.html.");
        setAuthLoading(false);
        return;
      }
      // Clean up old reCAPTCHA if exists (prevents duplicate re-render error)
      if (window.recaptchaVerifier) {
        try { window.recaptchaVerifier.clear(); } catch {}
        window.recaptchaVerifier = null;
      }
      // Now create a new one
      window.recaptchaVerifier = new RecaptchaVerifier(authInstance, recaptchaContainerRef.current, {
        'size': 'invisible',
        'callback': () => {},
        'expired-callback': () => {
          setMessage("reCAPTCHA expired. Please try again.");
          setAuthLoading(false);
        }
      });
      await window.recaptchaVerifier.render();
      const appVerifier = window.recaptchaVerifier;
      const result = await signInWithPhoneNumber(authInstance, phoneNumber, appVerifier);
      setConfirmationResult(result);
      setMessage('OTP sent successfully! Please enter the code.');
    } catch (error: any) {
      if (error.code === 'auth/invalid-phone-number') {
        setMessage('Invalid phone number format. Please include country code (e.g., +91).');
      } else if (error.code === 'auth/too-many-requests') {
        setMessage('Too many OTP requests. Please try again later.');
      } else if (error.code === 'auth/admin-restricted-operation') {
        setMessage('Phone authentication is restricted. Please check Firebase project settings (reCAPTCHA, domains).');
      } else if (error.code === 'auth/web-storage-unsupported') {
        setMessage('Web storage is not supported in this browser. Please enable cookies.');
      } else if (
        error.message?.includes('recaptcha has already been rendered') // Covers odd cases
      ) {
        setMessage("Phone authentication is temporarily unavailable. Please reload the page and try again.");
      } else {
        setMessage(`Failed to send OTP: ${error.message}`);
      }
    } finally {
      setAuthLoading(false);
      // Clean up on error/finally for reliability
      if (window.recaptchaVerifier && window.recaptchaVerifier.clear) {
        try { window.recaptchaVerifier.clear(); } catch {}
        window.recaptchaVerifier = null;
      }
    }
  };

  const handleVerifyOtp = async () => {
    setAuthLoading(true);
    setMessage('');
    try {
      if (!confirmationResult) {
        setMessage('No confirmation result found. Please send OTP first.');
        setAuthLoading(false);
        return;
      }
      if (!otp) {
        setMessage('Please enter the OTP.');
        setAuthLoading(false);
        return;
      }
      await confirmationResult.confirm(otp);
      setMessage('Phone number verified successfully!');
      setOtp('');
      if (window.recaptchaVerifier && window.recaptchaVerifier.clear) {
        try { window.recaptchaVerifier.clear(); } catch {}
        window.recaptchaVerifier = null;
      }
      navigate('/', { replace: true });
    } catch (error: any) {
      if (error.code === 'auth/invalid-verification-code') {
        setMessage('Invalid OTP. Please try again.');
      } else if (error.code === 'auth/code-expired') {
        setMessage('OTP expired. Please resend.');
      } else {
        setMessage(`OTP verification failed: ${error.message}`);
      }
    } finally {
      setAuthLoading(false);
    }
  };

  const handleSignOut = async () => {
    setAuthLoading(true);
    setMessage('');
    try {
      if (!authInstance) throw new Error("Firebase Auth not initialized.");
      await authInstance.signOut();
      setMessage('Signed out successfully.');
      navigate('/signed-out');
    } catch (error: any) {
      setMessage(`Sign out failed: ${error.message}`);
    } finally {
      setAuthLoading(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-50 font-inter antialiased">
        <div className="text-gray-700 text-xl">Loading authentication...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-50 p-4 font-inter antialiased">
      <div className="bg-white rounded-3xl shadow-xl p-8 sm:p-10 max-w-md w-full space-y-6 text-center">
        {/* Page Header */}
        <h1 className="text-4xl font-extrabold text-gray-800 mb-4">Welcome to Cookie Gallery!</h1>
        <p className="text-lg text-gray-600 mb-6">Sign in to unlock exclusive sweet deals.</p>

        <h2 className="text-3xl font-extrabold text-gray-800 mb-6">
          {user ? "You're Logged In!" : "Sign In / Sign Up"}
        </h2>

        {user ? (
          <div className="space-y-4">
            <p className="text-gray-700 text-lg">
              Logged in as: <span className="font-semibold">{user.displayName || user.email || user.phoneNumber || user.uid}</span>
            </p>
            <button
              onClick={handleSignOut}
              disabled={authLoading}
              className="w-full bg-red-500 hover:bg-red-600 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-red-300"
            >
              {authLoading ? 'Signing Out...' : 'Sign Out'}
            </button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Google Sign-In */}
            <button
              onClick={handleGoogleSignIn}
              disabled={authLoading}
              className="w-full flex items-center justify-center gap-3 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-blue-300"
            >
              {authLoading ? (
                <span className="flex items-center"><svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Signing In...</span>
              ) : (
                <>
                  <img src={googleLogoUrl} className="w-5 h-5" alt="Google" />
                  Sign in with Google
                </>
              )}
            </button>
            <div className="relative my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">Or sign in with phone</span>
              </div>
            </div>
            {/* Phone Number Sign-In */}
            {!confirmationResult ? (
              <div className="space-y-4">
                <input
                  type="tel"
                  placeholder="Enter phone number (e.g., +919876543210)"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-transparent text-gray-800 bg-white"
                  autoComplete="tel"
                  disabled={authLoading}
                />
                <button
                  onClick={handleSendOtp}
                  disabled={authLoading || !phoneNumber}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-300"
                >
                  {authLoading ? (
                    <span className="flex items-center"><svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Sending OTP...</span>
                  ) : (
                    'Send OTP'
                  )}
                </button>
                <div id="recaptcha-container" ref={recaptchaContainerRef}></div>
              </div>
            ) : (
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-300 focus:border-transparent text-gray-800 bg-white"
                  autoComplete="one-time-code"
                  disabled={authLoading}
                />
                <button
                  onClick={handleVerifyOtp}
                  disabled={authLoading || !otp}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 px-6 rounded-xl shadow-lg transition-all duration-300 ease-in-out hover:scale-105 focus:outline-none focus:ring-4 focus:ring-indigo-300"
                >
                  {authLoading ? (
                    <span className="flex items-center"><svg className="animate-spin h-5 w-5 mr-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Verifying OTP...</span>
                  ) : (
                    'Verify OTP'
                  )}
                </button>
              </div>
            )}
          </div>
        )}

        {message && (
          <div className={`mt-4 p-3 rounded-lg ${message.toLowerCase().includes('success') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
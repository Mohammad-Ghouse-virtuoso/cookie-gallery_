
// src/context/AuthContext.tsx

import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { getAuth, onAuthStateChanged, signInWithCustomToken, getRedirectResult, setPersistence, browserLocalPersistence, type User } from 'firebase/auth'; // Import User type
import { initializeApp, getApps } from 'firebase/app'; // Safe Firebase app init
import { getFirestore, doc, setDoc } from 'firebase/firestore'; // For saving user profile


const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Global variables provided by Canvas environment (if applicable)
declare const __initial_auth_token: string | undefined;

const detectE2EMode = (): boolean => {
  if (import.meta.env.VITE_E2E === 'true') {
    return true;
  }
  if (typeof window !== 'undefined') {
    try {
      return window.sessionStorage.getItem('cg_e2e_mode') === 'true';
    } catch {
      return false;
    }
  }
  return false;
};

const isE2ETestMode = detectE2EMode();

// Define the shape of your AuthContext
interface AuthContextType {
  user: User | null; // Firebase User object or null
  loading: boolean; // True while initial auth state is being determined
  bootChecked: boolean; // True after /health boot id is checked
  authDisabled: boolean; // True when Firebase config missing or init failed
  signOutUser: () => Promise<void>; // Function to sign out
}

// Create the context
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Detect backend restarts to refresh auth once
async function getServerBootId(): Promise<string | null> {
  try {
    const res = await fetch((import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000') + '/health', { cache: 'no-store' });
    if (!res.ok) return null;
    const data = await res.json();
    return data.boot_id || null;
  } catch { return null; }
}


// Auth Provider Component
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!isE2ETestMode); // True while auth state resolving
  const [bootChecked, setBootChecked] = useState(isE2ETestMode); // Becomes true after /health processed
  const [reloadChecked, setReloadChecked] = useState(isE2ETestMode); // ensures we process refresh policy exactly once
  const [authDisabled, setAuthDisabled] = useState(isE2ETestMode); // If Firebase config missing or init fails

  // Helper to verify minimal Firebase config presence (avoid throwing in dev)
  const hasConfig = Boolean(
    firebaseConfig.apiKey &&
    firebaseConfig.authDomain &&
    firebaseConfig.projectId &&
    firebaseConfig.appId
  );

  // Detect backend restart and refresh auth once after reload
  useEffect(() => {
    if (isE2ETestMode) {
      setBootChecked(true);
      return () => undefined;
    }

    let mounted = true;
    (async () => {
      // If auth is disabled or no server configured, skip boot id checks to avoid noisy CORS errors in dev
      if (!hasConfig) {
        setBootChecked(true);
        return;
      }
      const bootId = await getServerBootId();
      const stored = sessionStorage.getItem('server_boot_id');
      if (mounted) {
        if (!stored && bootId) {
          sessionStorage.setItem('server_boot_id', bootId);
        } else if (stored && bootId && stored !== bootId) {
          // Only attempt signOut if auth is enabled
          if (hasConfig && getApps().length) {
            try { await getAuth().signOut().catch(() => { /* ignore signOut error */ }); } catch { /* ignore */ }
          }
          sessionStorage.setItem('server_boot_id', bootId);
        }
        setBootChecked(true);
      }
    })();
    return () => { mounted = false };
  }, [hasConfig]);

  // Enforce sign-out-on-refresh policy (to reset user like cart resets) once per browser load
  useEffect(() => {
    if (isE2ETestMode) return;
    if (reloadChecked) return;
    const already = sessionStorage.getItem('cg_reload_done');
    const doReset = !already; // first load after refresh
    (async () => {
      if (doReset && hasConfig && getApps().length && getAuth().currentUser) {
        await getAuth().signOut().catch(() => { /* ignore */ });
      }
      sessionStorage.setItem('cg_reload_done', '1');
      setReloadChecked(true);
    })();
  }, [reloadChecked, hasConfig]);

  // Set persistence once
  useEffect(() => {
    if (isE2ETestMode) return;
    if (!hasConfig) return; // no-op when config missing
    try {
      // Initialize Firebase app once if not already
      if (!getApps().length) initializeApp(firebaseConfig);
      setPersistence(getAuth(), browserLocalPersistence).catch((e) => {
        console.warn('AuthContext: Failed to set local persistence, falling back to default.', e);
      });
      setAuthDisabled(false);
    } catch (e) {
      console.warn('AuthContext: Firebase init failed, disabling auth for this session.', e);
      setAuthDisabled(true);
      setLoading(false);
    }
  }, [hasConfig]);

  useEffect(() => {
    if (isE2ETestMode) {
      setUser(null);
      setLoading(false);
      setAuthDisabled(true);
      return;
    }

    if (!hasConfig) {
      // No Firebase config: disable auth and end loading to unblock UI
      setAuthDisabled(true);
      setLoading(false);
      return;
    }
    try {
      if (!getApps().length) initializeApp(firebaseConfig);
      const auth = getAuth();
      const firestore = getFirestore();
      const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
        setUser(currentUser);
        setLoading(false); // Auth state determined
        console.log('AuthContext: Auth state changed. User UID:', currentUser ? currentUser.uid : 'null');

        (async () => {
          if (currentUser && !currentUser.isAnonymous) {
            try {
              await saveUserProfileToFirestore(currentUser, firestore);
            } catch (e) {
              console.warn('AuthContext: client Firestore save failed, trying backend /save-user', e);
              try {
                const token = await currentUser.getIdToken();
                await fetch((import.meta.env.VITE_API_BASE_URL || '') + '/save-user', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                  },
                  body: JSON.stringify({
                    displayName: currentUser.displayName,
                    phoneNumber: currentUser.phoneNumber,
                  })
                });
                console.log('AuthContext: Saved user via backend /save-user');
              } catch (be) {
                console.error('AuthContext: Backend /save-user failed:', be);
              }
            }
          }
        })();
      });

      // Check redirect result after onAuthStateChanged setup
      getRedirectResult(auth).catch((e) => {
        console.warn('AuthContext: getRedirectResult error', e);
      });

      // Perform initial sign-in if custom token present
      (async () => {
        if (!auth.currentUser) {
          if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            await signInWithCustomToken(auth, __initial_auth_token);
          }
        }
      })();

      return () => unsubscribe();
    } catch (e) {
      console.warn('AuthContext: Error during Firebase setup; disabling auth.', e);
      setAuthDisabled(true);
      setLoading(false);
    }
  }, [hasConfig]);

  async function saveUserProfileToFirestore(user: User, firestore: any) {
    const userRef = doc(firestore, 'users', user.uid); // doc id = UID
    try {
      await setDoc(userRef, {
        uid: user.uid,
        email: user.email || null,
        displayName: user.displayName || null,
        phoneNumber: user.phoneNumber || null,
        updatedAt: new Date(),
      }, { merge: true }); // upsert to also handle "new data"
      console.log('AuthContext: Upserted user profile doc for', user.uid);
    } catch (error: any) {
      console.error("AuthContext: Error saving user profile to Firestore:", error);
      throw error; // IMPORTANT: triggers backend /save-user fallback
    }
  }

  const signOutUser = async () => {
    try {
      if (!hasConfig || !getApps().length) return; // nothing to do
      const auth = getAuth();
      if (auth.currentUser) await auth.signOut();
    } catch (error: any) {
      console.error("AuthContext: Error signing out:", error);
      throw error;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, bootChecked, authDisabled, signOutUser }}>
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

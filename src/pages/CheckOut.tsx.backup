// src/pages/Checkout.tsx

import { useState, useEffect } from 'react';
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { cookies as cookieList } from "../data/cookies";
import { formatPrice } from "../utils/formatPrice";
import sadCookie from "../assets/Cookie!.png";
import { useAuth } from '../context/AuthContext';

// This is the Razorpay script loader
function loadScript(src: string): Promise<boolean> {
  console.log("Attempting to load script:", src);
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => {
      console.log("Script loaded successfully:", src);
      resolve(true);
    };
    script.onerror = () => {
      console.error("Script failed to load:", src);
      resolve(false);
    };
    document.body.appendChild(script);
  });
}

// Hard reset any Razorpay client-side cache and SDK instance
function resetRazorpayCaches() {
  try {
    // Remove any local/session storage entries Razorpay might have left behind
    const purge = (storage: Storage) => {
      const keys: string[] = [];
      for (let i = 0; i < storage.length; i++) {
        const k = storage.key(i);
        if (!k) continue;
        const keyLower = k.toLowerCase();
        if (keyLower.includes('razorpay') || keyLower.includes('rzp') || keyLower.includes('checkout')) {
          keys.push(k);
        }
      }
      keys.forEach(k => storage.removeItem(k));
    };
    purge(window.localStorage);
    purge(window.sessionStorage);

    // Remove any previously injected checkout.js script
    document.querySelectorAll('script[src*="checkout.razorpay.com/"]').forEach((n) => n.parentElement?.removeChild(n));

    // Drop global constructor so a fresh one is created when we reload the script
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    delete (window as any).Razorpay;
  } catch (e) {
    console.warn('resetRazorpayCaches: non-fatal', e);
  }
}

// Extend Window interface to include Razorpay for TypeScript
declare global {
  interface Window {
    Razorpay: any;
  }
}

export default function Checkout() {
  const { cart, setCart } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();

  const selectedCookies = cookieList.filter(cookie => cart[cookie.id] > 0);
  const totalAmount = selectedCookies.reduce((sum, cookie) => sum + (cart[cookie.id] * cookie.price), 0);

  const [message, setMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);

  useEffect(() => {
    if (!user) {
      setShowLoginPrompt(true);
    } else {
      setShowLoginPrompt(false);
    }
  }, [user]);

  const API_BASE = import.meta.env.VITE_API_BASE_URL;
  async function getIdToken(): Promise<string | null> {
    try {
      const { getAuth } = await import('firebase/auth');
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) return null;
      return await user.getIdToken();
    } catch {
      return null;
    }
  }

  const handlePayment = async () => {
    console.log("handlePayment function started.");
    setMessage(null);
    setIsLoading(true);

    // FIX: Add a check to ensure user is logged in
    if (!user) {
      setMessage("You must be logged in to proceed to payment.");
      setIsLoading(false);
      return;
    }

    // Ensure no stale SDK or cached user prefill persists across sessions
    resetRazorpayCaches();
    const sdkUrl = `https://checkout.razorpay.com/v1/checkout.js?cb=${Date.now()}`; // cache-bust
    const res = await loadScript(sdkUrl);
    if (!res) {
      setMessage("Razorpay SDK failed to load. Please check your internet connection.");
      setIsLoading(false);
      return;
    }
    console.log("Razorpay SDK is ready.");

    try {
      console.log(`Attempting to create order on backend: ${API_BASE}/create-order`);
      const token = await getIdToken();
      const orderResponse = await fetch(`${API_BASE}/create-order`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ amount: totalAmount, currency: "INR" }),
      });

      if (!orderResponse.ok) {
        const errorText = await orderResponse.text();
        console.error("Backend /create-order failed:", orderResponse.status, errorText);
        setMessage(`Server error creating order: ${errorText}`);
        setIsLoading(false);
        return;
      }

      const order = await orderResponse.json();
      console.log("Order created successfully by backend:", order);

      const options = {
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: order.amount,
        currency: order.currency,
        name: "Cookie Gallery",
        description: "A Delicious Transaction",
        order_id: order.id,
        handler: async function (response: any) {
          console.log("Razorpay handler function called with response:", response);
          if (response.razorpay_payment_id) {
            setMessage(`Payment process initiated. Please wait for verification...`);
            console.log(`Attempting to verify payment on backend: ${API_BASE}/verify-signature`);
            try {
              const verificationResponse = await fetch(`${API_BASE}/verify-signature`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  order_id: response.razorpay_order_id,
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_signature: response.razorpay_signature,
                }),
              });

              if (!verificationResponse.ok) {
                const errorVerificationText = await verificationResponse.text();
                console.error("Backend /verify-signature failed:", verificationResponse.status, errorVerificationText);
                setMessage(`Verification server error: ${errorVerificationText}. Please contact support.`);
                setIsLoading(false);
                return;
              }

              const verificationResult = await verificationResponse.json();
              console.log("Verification result from backend:", verificationResult);

              if (verificationResult.success) {
                // FIX: Pass user.uid to the backend for Firestore storage
                const token2 = await getIdToken();
                await fetch(`${API_BASE}/save-order-data`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(token2 ? { Authorization: `Bearer ${token2}` } : {}),
                  },
                  body: JSON.stringify({
                    orderId: order.id,
                    items: cart,
                    paymentStatus: 'verified',
                    paymentAmount: order.amount / 100,
                    paymentCurrency: order.currency
                  })
                });

                setMessage(`Payment successful! Payment ID: ${response.razorpay_payment_id}. Order Verified.`);
                setCart({});
                navigate('/order-success');
              } else {
                setMessage(`Payment verification failed: ${verificationResult.message}. Please contact support.`);
              }
            } catch (verificationError) {
              console.error("Payment verification frontend error:", verificationError);
              setMessage("Error during payment verification. Please contact support.");
            }
          } else {
            setMessage("Payment failed or was cancelled.");
            console.error("Payment response (failure/cancellation):", response);
          }
          setIsLoading(false);
        },
        // Explicitly avoid Razorpay remembering previous user by disabling remember_customer
        remember_customer: false,
        prefill: {
          name: user?.displayName || (user?.email ? user.email.split('@')[0] : '') || '',
          email: user?.email ? String(user.email) : '',
          contact: user?.phoneNumber ? String(user.phoneNumber) : '',
        } as any,
        modal: {
          ondismiss: () => {
            // On dismiss, drop any possible persisted state so next attempt uses current user
            resetRazorpayCaches();
          }
        },
        theme: {
          color: "#10B981",
        },
      };

      // Ensure a fresh instance is created every time
      resetRazorpayCaches();
      const RazorpayCtor = (window as any).Razorpay;
      if (!RazorpayCtor) {
        setMessage('Razorpay SDK not available after load. Please retry.');
        setIsLoading(false);
        return;
      }
      const paymentObject = new RazorpayCtor(options);
      paymentObject.on('modal.close', () => {
        setMessage('Payment window closed without completing payment.');
        setIsLoading(false);
        console.log("Razorpay modal closed by user.");
      });
      paymentObject.open();
      console.log("Razorpay modal opened.");

    } catch (error) {
      console.error("General payment process error:", error);
      setMessage("An unexpected error occurred during payment. Please try again.");
      setIsLoading(false);
    }
  };

  if (selectedCookies.length === 0) {
    return (
      <main
        className="min-h-screen w-full flex flex-col items-center justify-center text-center p-4 font-inter antialiased"
        style={{
          background: 'linear-gradient(to bottom right,rgb(252, 252, 252),rgb(252, 251, 250))'
        }}
      >
        <img src={sadCookie} alt="Sad Cookie" className="w-40 h-40 mb-5 opacity-80" />
        <h2 className="text-3xl font-bold text-gray-400">Your bag is empty... :( </h2>
        <p className="text-gray-600 mt-2 mb-6 text-lg">Add some delicious cookies to make your day sweeter!</p>
        <Link to="/" className="text-lg px-8 py-3 bg-stone-200 text-white rounded-full font-bold shadow-lg hover:bg-blue-100 transition-transform hover:scale-105">
          Browse Cookies
        </Link>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen flex items-start justify-center p-4 sm:p-8 font-inter antialiased"
      style={{
        background: 'linear-gradient(to bottom right, #f8f9ff, #fafbfc)'
      }}
    >
      {showLoginPrompt && !user && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-6 z-50">
          <div className="bg-white p-8 rounded-3xl shadow-xl text-center space-y-4 relative w-full max-w-md">
            <h3 className="text-3xl font-extrabold text-gray-800">Please Sign In</h3>
            <p className="text-lg text-gray-600">You need to be signed in to proceed to payment.</p>
            <button
              onClick={() => navigate('/signin')}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all duration-200"
            >
              Go to Sign In
            </button>
          </div>
        </div>
      )}

      <div className="w-full max-w-lg lg:max-w-3xl bg-white rounded-3xl shadow-xl overflow-hidden p-6 sm:p-8 space-y-6 relative">
        <h1 className="text-4xl font-extrabold text-gray-800 text-center mb-6">Your Order Summary</h1>
        <p className="text-center text-gray-500 mb-8 italic">Ready to treat yourself? Let's get this batch to you!</p>

        <div className="space-y-4">
          {selectedCookies.map(cookie => (
            <div
              key={cookie.id}
              className="flex items-center justify-between bg-white p-4 rounded-xl shadow-sm transition-all duration-300 hover:shadow-md border border-gray-100"
            >
              <div className="flex items-center gap-4">
                <img src={cookie.src} className="w-20 h-20 object-contain rounded-lg bg-gray-50 p-1 shadow-inner" alt={cookie.name} />
                <div>
                  <div className="font-semibold text-lg text-gray-800">{cookie.name}</div>
                  <div className="text-gray-500">Quantity: {cart[cookie.id]}</div>
                </div>
              </div>
              <div className="font-bold text-xl text-teal-700">{formatPrice(cookie.price * cart[cookie.id])}</div>
            </div>
          ))}
        </div>

        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
          <span className="text-2xl font-bold text-gray-800">Total</span>
          <span className="text-3xl font-extrabold text-teal-800">{formatPrice(totalAmount)}</span>
        </div>

        {message && (
          <div className={`mt-4 p-3 rounded-lg text-center ${message.includes('successful') || message.includes('Verified') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message}
          </div>
        )}

        <button
          onClick={handlePayment}
          disabled={isLoading}
          className={`w-full text-white text-xl font-bold py-4 px-6 rounded-xl shadow-lg transform transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-teal-300
            ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 hover:scale-105 active:scale-95'}`}
        >
          {isLoading ? 'Processing Payment...' : 'Proceed to Pay'}
        </button>
      </div>
    </main>
  );
}
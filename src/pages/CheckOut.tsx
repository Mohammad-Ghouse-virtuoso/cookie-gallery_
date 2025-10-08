// src/pages/Checkout.tsx

import { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { cookies as cookieList } from "../data/cookies";
import { formatPrice } from "../utils/formatPrice";
import { useAuth } from '../context/AuthContext';
import { Elements, useStripe, useElements, PaymentElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';

// Initialize Stripe with your publishable key
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY);

// Main Checkout Component
export default function Checkout() {
  const { cart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const [paymentCompleted, setPaymentCompleted] = useState(false);

  const selectedCookies = cookieList.filter(cookie => cart[cookie.id] > 0);
  const totalAmount = selectedCookies.reduce((sum, cookie) => sum + (cart[cookie.id] * cookie.price), 0);

  useEffect(() => {
    if (!user) {
      setShowLoginPrompt(true);
    } else {
      setShowLoginPrompt(false);
    }
  }, [user]);

  // Handle empty cart redirect (but NOT if payment just completed)
  useEffect(() => {
    if (selectedCookies.length === 0 && !paymentCompleted) {
      const timer = setTimeout(() => {
        navigate('/');
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [selectedCookies.length, navigate, paymentCompleted]);

  // Don't render anything if cart is empty AND payment not completed (will redirect)
  if (selectedCookies.length === 0 && !paymentCompleted) {
    return null;
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

                <CheckoutFormWrapper 
          totalAmount={totalAmount} 
          cart={cart} 
          user={user}
          setPaymentCompleted={setPaymentCompleted}
        />
      </div>
    </main>
  );
}

// Wrapper component to handle payment intent creation and Elements setup
interface CheckoutFormWrapperProps {
  totalAmount: number;
  cart: Record<number, number>;
  user: any;
  setPaymentCompleted: (completed: boolean) => void;
}

function CheckoutFormWrapper({ totalAmount, cart, user, setPaymentCompleted }: CheckoutFormWrapperProps) {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [paymentIntentId, setPaymentIntentId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

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

  const createPaymentIntent = async () => {
    if (!user) {
      setError("You must be logged in to proceed to payment.");
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      console.log(`Creating payment intent on backend: ${API_BASE}/create-payment-intent`);
      const token = await getIdToken();
      
      const response = await fetch(`${API_BASE}/create-payment-intent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ amount: totalAmount, currency: "INR" }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("Backend /create-payment-intent failed:", response.status, errorText);
        setError(`Server error: ${errorText}`);
        setIsCreating(false);
        return;
      }

      const data = await response.json();
      console.log("Payment intent created successfully:", data.paymentIntentId);
      setClientSecret(data.clientSecret);
      setPaymentIntentId(data.paymentIntentId);
      setIsCreating(false);
    } catch (err) {
      console.error("Error creating payment intent:", err);
      setError("Failed to initialize payment. Please try again.");
      setIsCreating(false);
    }
  };

  if (!clientSecret) {
    return (
      <div className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg text-center bg-red-100 text-red-700">
            {error}
          </div>
        )}
        
        <button
          onClick={createPaymentIntent}
          disabled={isCreating}
          className={`w-full text-white text-xl font-bold py-4 px-6 rounded-xl shadow-lg transform transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-teal-300
            ${isCreating ? 'bg-gray-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 hover:scale-105 active:scale-95'}`}
        >
          {isCreating ? 'Initializing Payment...' : 'Proceed to Pay'}
        </button>
      </div>
    );
  }

  const options = {
    clientSecret,
    appearance: {
      theme: 'stripe' as const,
    },
  };

  return (
    <Elements stripe={stripePromise} options={options}>
      <CheckoutForm 
        totalAmount={totalAmount} 
        cart={cart} 
        user={user} 
        paymentIntentId={paymentIntentId}
        setPaymentCompleted={setPaymentCompleted}
      />
    </Elements>
  );
}

// CheckoutForm Component with Stripe hooks
interface CheckoutFormProps {
  totalAmount: number;
  cart: Record<number, number>;
  user: any;
  paymentIntentId: string;
  setPaymentCompleted: (completed: boolean) => void;
}

function CheckoutForm({ totalAmount, cart, user, paymentIntentId, setPaymentCompleted }: CheckoutFormProps) {
  const stripe = useStripe();
  const elements = useElements();
  const navigate = useNavigate();
  const { setCart } = useCart();

  const [message, setMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [paymentSucceeded, setPaymentSucceeded] = useState<boolean>(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!stripe || !elements) {
      setMessage("Payment system is still loading. Please wait a moment.");
      return;
    }

    setIsProcessing(true);
    setMessage(null);

    try {
      // Submit the payment to Stripe
      const result = await stripe.confirmPayment({
        elements,
        confirmParams: {
          return_url: `${window.location.origin}/order-success`,
        },
        redirect: 'if_required',
      });

      console.log("Stripe confirmPayment result:", result);

      // Check for errors
      if (result.error) {
        console.error("Payment confirmation error:", result.error);
        setMessage(result.error.message || "Payment failed. Please try again.");
        setIsProcessing(false);
        return;
      }

      // Payment succeeded
      if (result.paymentIntent) {
        const { paymentIntent } = result;
        console.log("Payment Intent Status:", paymentIntent.status);
        console.log("Full Payment Intent:", paymentIntent);
        
        if (paymentIntent.status === 'succeeded') {
          // Set success state immediately
          setPaymentSucceeded(true);
          setPaymentCompleted(true); // Prevent empty cart redirect
          setIsProcessing(false);
          setMessage(`✅ Payment Successful!`);
          
          try {
            const token = await getIdToken();
            
            // First, retrieve expanded payment details from backend
            console.log('🔍 Retrieving payment details from backend...');
            const detailsResponse = await fetch(`${API_BASE}/get-payment-details`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                paymentIntentId: paymentIntent.id
              })
            });
            
            let paymentDetails = {};
            if (detailsResponse.ok) {
              const detailsData = await detailsResponse.json();
              paymentDetails = detailsData.paymentDetails || {};
              console.log('✅ Payment details retrieved:', paymentDetails);
            } else {
              console.warn('⚠️ Could not retrieve payment details');
            }
            
            // Save order data to Firestore with enhanced metadata
            const saveResponse = await fetch(`${API_BASE}/save-order-data`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...(token ? { Authorization: `Bearer ${token}` } : {}),
              },
              body: JSON.stringify({
                paymentIntentId: paymentIntent.id,
                items: cart,
                paymentStatus: 'succeeded',
                paymentAmount: totalAmount,
                paymentCurrency: 'INR',
                orderStatus: 'pending',
                ...paymentDetails // Spread all payment details from backend
              })
            });

            if (saveResponse.ok) {
              console.log("✅ Order saved to Firestore successfully");
              setMessage(`🎉 Payment Successful! Order saved. Redirecting...`);
            } else {
              console.warn("⚠️ Failed to save order to Firestore:", await saveResponse.text());
              setMessage(`🎉 Payment Successful! (Order save pending)`);
            }
          } catch (saveError) {
            console.error("❌ Error saving order:", saveError);
            setMessage(`🎉 Payment Successful! (Order will be processed)`);
          }

          // Clear cart
          setCart({});
          
          // Redirect after 5 seconds to show success message longer
          setTimeout(() => {
            console.log("Redirecting to order success page...");
            navigate('/order-success');
          }, 5000);
          
        } else if (paymentIntent.status === 'requires_payment_method') {
          setMessage("❌ Payment failed. Please try another payment method.");
          setIsProcessing(false);
        } else if (paymentIntent.status === 'processing') {
          setMessage("⏳ Payment is processing. Please wait...");
          setIsProcessing(false);
        } else {
          setMessage(`⚠️ Payment status: ${paymentIntent.status}. Please contact support.`);
          setIsProcessing(false);
        }
      } else {
        // Unexpected: no error and no paymentIntent
        console.error("Unexpected response from Stripe:", result);
        setMessage("Payment response unclear. Please check your order history or contact support.");
        setIsProcessing(false);
      }
    } catch (error: any) {
      console.error("Payment processing error:", error);
      setMessage(error?.message || "An unexpected error occurred. Please try again.");
      setIsProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {!paymentSucceeded && (
        <div className="p-4 bg-gray-50 rounded-lg">
          <PaymentElement />
        </div>
      )}

      {paymentSucceeded && (
        <div className="p-6 bg-gradient-to-r from-green-400 to-emerald-500 rounded-xl shadow-lg text-center">
          <div className="text-4xl mb-2">🎉</div>
          <h2 className="text-xl font-bold text-white mb-1">Payment Successful!</h2>
          <p className="text-white text-sm">Redirecting to order confirmation...</p>
        </div>
      )}

      {message && (
        <div className={`mt-4 p-4 rounded-xl text-center font-semibold text-lg ${
          message.includes('🎉') || message.includes('Successful') 
            ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 border-2 border-green-500' 
            : message.includes('❌') || message.includes('failed')
            ? 'bg-red-100 text-red-700 border-2 border-red-500'
            : 'bg-yellow-100 text-yellow-700 border-2 border-yellow-500'
        }`}>
          {message}
        </div>
      )}

      {!paymentSucceeded && (
        <button
          type="submit"
          disabled={isProcessing || !stripe || !elements}
          className={`w-full text-white text-xl font-bold py-4 px-6 rounded-xl shadow-lg transform transition-all duration-300 ease-in-out focus:outline-none focus:ring-4 focus:ring-teal-300
            ${isProcessing || !stripe || !elements ? 'bg-gray-400 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 hover:scale-105 active:scale-95'}`}
        >
          {isProcessing ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Processing Payment...
            </span>
          ) : (
            'Pay Now'
          )}
        </button>
      )}

      {paymentSucceeded && (
        <div className="text-center text-gray-600 animate-pulse">
          Redirecting to order confirmation...
        </div>
      )}
    </form>
  );
}
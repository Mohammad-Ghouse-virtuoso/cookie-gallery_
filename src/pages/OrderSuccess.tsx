// src/pages/OrderSuccess.tsx

import { Link, useLocation } from 'react-router-dom';
import { formatPrice } from '@/utils/formatPrice';
import orderPlacedBanner from '../assets/Order-placed-Banner.png';
import { useEffect } from 'react';
import confetti from 'canvas-confetti';

type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
  image?: string;
};

type OrderData = {
  orderId: string;
  items: OrderItem[];
  totalAmount: number;
  paymentStatus: string;
  cardBrand?: string;
  cardLast4?: string;
  customerEmail?: string;
  receiptUrl?: string | null;
};

export default function OrderSuccess() {
  const location = useLocation();
  const orderData = location.state as OrderData | null;

  useEffect(() => {
    // Large confetti burst for celebration
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
      zIndex: 9999,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  }, []);

  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center bg-gradient-to-br from-green-50 to-teal-50 text-center p-4 font-inter antialiased">
      <div className="max-w-2xl w-full">
        <img src={orderPlacedBanner} alt="Order placed" className="w-80 max-w-[90vw] mb-6 drop-shadow-lg rounded-2xl mx-auto" />
        <h1 className="text-4xl font-extrabold text-green-800 mb-4">Order Placed Successfully!</h1>
        <p className="text-lg text-gray-600 mb-8 max-w-md mx-auto">
          Thank you for your purchase. Your delicious cookies are on their way!
        </p>

        {orderData && (
          <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 text-left">
            <div className="border-b border-gray-200 pb-4 mb-4">
              <h2 className="text-xl font-semibold text-gray-800 mb-2">Order Details</h2>
              <div className="flex justify-between text-sm text-gray-600">
                <span>Order ID:</span>
                <span className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">{orderData.orderId.slice(0, 24)}...</span>
              </div>
              {orderData.customerEmail && (
                <div className="flex justify-between text-sm text-gray-600 mt-2">
                  <span>Confirmation sent to:</span>
                  <span className="font-medium">{orderData.customerEmail}</span>
                </div>
              )}
            </div>

            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-3">Items Ordered</h3>
              <ul className="space-y-3">
                {orderData.items.map((item) => (
                  <li key={item.id} className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-3">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="h-12 w-12 rounded-lg object-cover" />
                      ) : (
                        <div className="h-12 w-12 rounded-lg bg-[#FBE9DA] flex items-center justify-center text-sm font-semibold text-[#C47A41]">
                          {item.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-800">{item.name}</p>
                        <p className="text-sm text-gray-500">Qty: {item.qty}</p>
                      </div>
                    </div>
                    <p className="font-semibold text-gray-800">{formatPrice(item.price * item.qty)}</p>
                  </li>
                ))}
              </ul>
            </div>

            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between items-center mb-2">
                <span className="text-lg font-semibold text-gray-800">Total Amount</span>
                <span className="text-2xl font-bold text-green-700">{formatPrice(orderData.totalAmount)}</span>
              </div>
              {orderData.cardBrand && orderData.cardLast4 && (
                <div className="flex justify-between text-sm text-gray-600 mt-2">
                  <span>Payment Method:</span>
                  <span className="font-medium capitalize">{orderData.cardBrand} ending in {orderData.cardLast4}</span>
                </div>
              )}
              <div className="flex justify-between text-sm text-gray-600 mt-1">
                <span>Payment Status:</span>
                <span className="font-medium text-green-600 capitalize">{orderData.paymentStatus}</span>
              </div>
            </div>
          </div>
        )}

        {/* Receipt Button - Always Available */}
        {orderData && (
          <div className="mt-6 mb-6 rounded-2xl border border-[#E2B97F]/30 bg-gradient-to-br from-[#FFF9F0] via-white to-[#FEF5E7] p-6 shadow-[0_4px_20px_rgba(196,122,65,0.08)]">
            <div className="mb-4 flex items-start gap-3">
              <div className="rounded-xl bg-gradient-to-br from-[#D4A574] to-[#C47A41] p-2.5 shadow-sm">
                <svg 
                  className="h-6 w-6 text-white" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                  />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-[#0A2540]">Payment Receipt</h3>
                <p className="mt-1 text-sm text-gray-600">
                  View your detailed receipt with all order items, payment information, and transaction details.
                </p>
              </div>
            </div>
            <Link
              to="/receipt"
              state={orderData}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#D4A574] to-[#C47A41] px-6 py-3.5 text-base font-semibold text-white shadow-[0_2px_12px_rgba(196,122,65,0.2)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(196,122,65,0.3)] active:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C47A41] focus-visible:ring-offset-2"
            >
              <svg 
                className="h-5 w-5" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                />
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" 
                />
              </svg>
              View Receipt
            </Link>
          </div>
        )}

        {/* Prominent Primary CTA + Secondary Action */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link
            to="/orders"
            className="group px-10 py-4 bg-gradient-to-br from-[#D4A574] to-[#C47A41] text-white rounded-2xl font-bold text-lg shadow-[0_4px_20px_rgba(196,122,65,0.25)] hover:-translate-y-1 hover:shadow-[0_8px_32px_rgba(196,122,65,0.35)] active:translate-y-0 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C47A41] focus-visible:ring-offset-2 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-2xl" />
            <span className="relative z-10 flex items-center justify-center gap-2">
              📦 View My Orders
            </span>
          </Link>
          <Link
            to="/cookies"
            className="px-10 py-4 bg-white border-2 border-[#E2B97F]/40 text-[#5B4636] rounded-2xl font-semibold text-lg shadow-sm hover:bg-[#FFF9F0] hover:border-[#D4A574] hover:-translate-y-0.5 transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C47A41] focus-visible:ring-offset-2"
          >
            🍪 Browse Cookies
          </Link>
        </div>
      </div>
    </main>
  );
}
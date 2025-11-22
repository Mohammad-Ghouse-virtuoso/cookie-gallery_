// src/pages/OrderSuccess.tsx

import { Link, useLocation } from 'react-router-dom';
import { formatPrice } from '@/utils/formatPrice';
import orderPlacedBanner from '../assets/Order-placed-Banner.png';

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

        {/* Receipt Button - Always visible if available */}
        {orderData?.receiptUrl && (
          <div className="mt-6 mb-6 rounded-xl border border-[rgba(99,102,241,0.2)] bg-gradient-to-br from-[#F0F1FF] to-[#FAFBFF] p-5 shadow-md">
            <div className="mb-3 flex items-center gap-2">
              <svg 
                className="h-5 w-5 text-[#4F46E5]" 
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
              <h3 className="text-sm font-semibold text-[#4F46E5]">Official Receipt Available</h3>
            </div>
            <p className="mb-4 text-xs text-[#6366F1]">
              Download your official payment receipt from Stripe for your records.
            </p>
            <a
              href={orderData.receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#6366F1] to-[#4F46E5] px-6 py-3 text-sm font-bold text-white shadow-[0_8px_16px_rgba(99,102,241,0.3)] transition-all duration-200 hover:-translate-y-0.5 hover:scale-105 hover:shadow-[0_12px_24px_rgba(99,102,241,0.4)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2"
            >
              <svg 
                className="h-4 w-4" 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" 
                />
              </svg>
              View Receipt
            </a>
          </div>
        )}

        {/* Prominent Primary CTA + Secondary Action */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center mt-8">
          <Link
            to="/cookies"
            className="px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-full font-bold text-lg shadow-[0_12px_24px_rgba(5,150,105,0.3)] hover:-translate-y-0.5 hover:scale-105 hover:shadow-[0_16px_32px_rgba(5,150,105,0.4)] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
          >
            Browse Cookies
          </Link>
          <Link
            to="/"
            className="px-8 py-4 bg-white border-2 border-gray-300 text-gray-800 rounded-full font-semibold text-lg shadow-md hover:bg-gray-50 hover:border-gray-400 hover:scale-105 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 focus-visible:ring-offset-2"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </main>
  );
}
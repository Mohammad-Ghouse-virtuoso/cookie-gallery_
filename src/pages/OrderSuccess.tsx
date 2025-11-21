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

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link
            to="/"
            className="px-6 py-3 bg-[#3B2B1A] text-white rounded-full font-bold shadow-lg hover:bg-[#4B4035] transition-transform hover:scale-105"
          >
            Continue Shopping
          </Link>
          <Link
            to="/cookies"
            className="px-6 py-3 bg-white border-2 border-gray-300 text-gray-800 rounded-full font-bold shadow-md hover:bg-gray-50 transition-transform hover:scale-105"
          >
            Browse Cookies
          </Link>
        </div>
      </div>
    </main>
  );
}
// src/pages/Receipt.tsx

import { useLocation, useNavigate } from 'react-router-dom';
import { formatPrice } from '@/utils/formatPrice';
import { useEffect } from 'react';

type OrderItem = {
  id: string;
  name: string;
  qty: number;
  price: number;
  image?: string;
};

type ReceiptData = {
  orderId: string;
  items: OrderItem[];
  totalAmount: number;
  paymentStatus: string;
  cardBrand?: string;
  cardLast4?: string;
  customerEmail?: string;
  paidAt?: string;
  transactionId?: string;
};

export default function Receipt() {
  const location = useLocation();
  const navigate = useNavigate();
  const receiptData = location.state as ReceiptData | null;

  useEffect(() => {
    if (!receiptData) {
      navigate('/');
    }
  }, [receiptData, navigate]);

  if (!receiptData) {
    return null;
  }

  const currentDate = receiptData.paidAt || new Date().toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const handlePrint = () => {
    window.print();
  };

  const subtotal = receiptData.totalAmount;
  const tax = 0; // Add tax calculation if needed
  const total = subtotal + tax;

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 print:bg-white">
      <div className="mx-auto max-w-3xl bg-white shadow-lg print:shadow-none">
        {/* Header */}
        <div className="border-b-2 border-gray-200 bg-gradient-to-r from-green-50 to-emerald-50 px-8 py-6 print:bg-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Cookie Gallery</h1>
              <p className="mt-1 text-sm text-gray-600">Payment Receipt</p>
            </div>
            <div className="text-right">
              <div className="inline-flex rounded-full bg-green-100 px-4 py-2">
                <span className="text-sm font-semibold text-green-800">PAID</span>
              </div>
            </div>
          </div>
        </div>

        {/* Receipt Details */}
        <div className="px-8 py-6">
          <div className="grid grid-cols-2 gap-8 border-b border-gray-200 pb-6">
            {/* Left Column */}
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Receipt Details</h2>
              <div className="mt-4 space-y-2">
                <div>
                  <p className="text-xs text-gray-500">Receipt Number</p>
                  <p className="font-mono text-sm font-medium text-gray-900">
                    {receiptData.orderId.slice(0, 8).toUpperCase()}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Transaction ID</p>
                  <p className="font-mono text-sm font-medium text-gray-900">
                    {receiptData.transactionId || receiptData.orderId.slice(0, 16)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Date</p>
                  <p className="text-sm font-medium text-gray-900">{currentDate}</p>
                </div>
              </div>
            </div>

            {/* Right Column */}
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-500">Customer Information</h2>
              <div className="mt-4 space-y-2">
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm font-medium text-gray-900">{receiptData.customerEmail || 'N/A'}</p>
                </div>
                {receiptData.cardBrand && receiptData.cardLast4 && (
                  <div>
                    <p className="text-xs text-gray-500">Payment Method</p>
                    <p className="text-sm font-medium capitalize text-gray-900">
                      {receiptData.cardBrand} •••• {receiptData.cardLast4}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500">Status</p>
                  <p className="text-sm font-semibold capitalize text-green-600">{receiptData.paymentStatus}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Items Table */}
          <div className="py-6">
            <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-gray-500">Order Items</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200 text-left text-xs font-semibold uppercase tracking-wide text-gray-500">
                  <th className="pb-3">Item</th>
                  <th className="pb-3 text-center">Quantity</th>
                  <th className="pb-3 text-right">Unit Price</th>
                  <th className="pb-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {receiptData.items.map((item) => (
                  <tr key={item.id} className="text-sm">
                    <td className="py-4">
                      <div className="flex items-center gap-3">
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.name}
                            className="h-12 w-12 rounded-lg object-cover print:hidden"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-orange-100 print:hidden">
                            <span className="text-xs font-bold text-orange-600">
                              {item.name.slice(0, 2).toUpperCase()}
                            </span>
                          </div>
                        )}
                        <span className="font-medium text-gray-900">{item.name}</span>
                      </div>
                    </td>
                    <td className="py-4 text-center text-gray-600">{item.qty}</td>
                    <td className="py-4 text-right text-gray-600">{formatPrice(item.price)}</td>
                    <td className="py-4 text-right font-semibold text-gray-900">
                      {formatPrice(item.price * item.qty)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="border-t-2 border-gray-200 pt-6">
            <div className="flex justify-end">
              <div className="w-64 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal</span>
                  <span className="font-medium text-gray-900">{formatPrice(subtotal)}</span>
                </div>
                {tax > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Tax</span>
                    <span className="font-medium text-gray-900">{formatPrice(tax)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-gray-200 pt-2">
                  <span className="text-base font-semibold text-gray-900">Total Paid</span>
                  <span className="text-xl font-bold text-green-700">{formatPrice(total)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="mt-8 rounded-lg bg-gray-50 p-6 print:bg-gray-100">
            <p className="text-center text-xs text-gray-600">
              Thank you for your order! If you have any questions about this receipt, please contact us at{' '}
              <a href="mailto:support@cookiegallery.com" className="font-medium text-green-600 hover:underline">
                support@cookiegallery.com
              </a>
            </p>
            <p className="mt-2 text-center text-xs text-gray-500">
              This is an electronic receipt. No signature required.
            </p>
          </div>
        </div>

        {/* Action Buttons - Hidden on Print */}
        <div className="border-t border-gray-200 bg-gray-50 px-8 py-6 print:hidden">
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <button
              onClick={() => navigate('/order-success', { state: receiptData })}
              className="rounded-lg border-2 border-gray-300 bg-white px-6 py-3 text-sm font-semibold text-gray-700 transition-all hover:border-gray-400 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400"
            >
              ← Back to Order
            </button>
            <div className="flex gap-3">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-green-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
                  />
                </svg>
                Print Receipt
              </button>
              <button
                onClick={() => navigate('/cookies')}
                className="rounded-lg border-2 border-green-600 bg-white px-6 py-3 text-sm font-semibold text-green-600 transition-all hover:bg-green-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600"
              >
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

import { useEffect } from 'react';

export default function PrivacyPolicy() {
  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      <div className="max-w-4xl mx-auto px-6 py-16 font-inter">
        <h1 className="text-3xl md:text-4xl font-extrabold text-gray-800 mb-4">Privacy & Terms</h1>
        <p className="text-gray-600 mb-6">We value your privacy and want to be transparent about our policies.</p>
        <div className="prose max-w-none text-gray-700">
          <h2 id="return-policy" className="text-2xl font-bold text-gray-800 mt-8 mb-4">Return & Refund Policy</h2>
          <p className="mb-4">
            <strong>No Returns or Exchanges:</strong> All cookie products are perishable consumable goods made fresh to order. 
            Due to the nature of food items and health regulations, we cannot accept returns or exchanges once an order has been placed.
          </p>
          
          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Damaged or Defective Products</h3>
          <p className="mb-4">
            If your order arrives damaged during shipping or you receive a defective product, please contact us within 24 hours of delivery with:
          </p>
          <ul className="list-disc pl-6 mb-4">
            <li>Your order number</li>
            <li>Photos of the damaged/defective items</li>
            <li>A brief description of the issue</li>
          </ul>
          <p className="mb-4">
            We will review your case and may offer a replacement or store credit at our discretion.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Wrong Items Delivered</h3>
          <p className="mb-4">
            If you receive incorrect items, please contact us immediately. We will arrange for the correct items to be sent at no additional cost.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Order Cancellation</h3>
          <p className="mb-4">
            Orders can be cancelled within 2 hours of placement. After this window, production begins and cancellation is not possible. 
            Contact us immediately if you need to cancel an order.
          </p>

          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">Your Rights</h3>
          <p className="mb-4">
            Under consumer protection laws, you have rights regarding product quality and safety. If you believe your rights have been violated, 
            you may file a complaint with the appropriate consumer protection authority in your jurisdiction.
          </p>

          <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">Privacy Policy</h2>
          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">What we collect</h3>
          <ul className="list-disc pl-6 mb-4">
            <li>Account details provided during sign-in</li>
            <li>Order information and preferences</li>
            <li>Technical and usage data to improve the site</li>
          </ul>
          <h3 className="text-xl font-semibold text-gray-800 mt-6 mb-3">How we use it</h3>
          <p className="mb-4">We use your data to process orders, improve our services, and communicate updates or offers with your consent.</p>
          
          <h2 className="text-2xl font-bold text-gray-800 mt-8 mb-4">Contact</h2>
          <p className="mb-4">If you have questions about any of these policies, please reach out to us via the Contact section.</p>
        </div>
      </div>
    </div>
  );
}


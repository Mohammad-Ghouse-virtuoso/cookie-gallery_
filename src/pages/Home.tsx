import { useState, useEffect } from 'react';
import { cookies as cookieList, type CookieData } from '../data/cookies'; // Importing from your data file
import { useCart } from '../context/CartContext';
import { FaInstagram, FaFacebook } from 'react-icons/fa'; // Ensure react-icons is installed
import { FaXTwitter } from 'react-icons/fa6';
import { FiMail, FiPhone, FiMapPin } from 'react-icons/fi';
import { Link, useLocation, useNavigate } from 'react-router-dom'; // <--- ADDED: useLocation, useNavigate
import { useAuth } from '../context/AuthContext'; // Use AuthContext

// Importing the separate components
import Hero from '../components/Hero';
import CookieCard from '../components/CookieCard';
import CookieDetailsModal from '../components/CookieDetailModal';
import ReviewsSection from '../components/ReviewsSection';


export default function Home() {
  const { cart, setCart } = useCart();
  const { user, loading } = useAuth(); // <--- ADDED: Get user and loading state
  const location = useLocation(); // <--- ADDED: Hook to access URL parameters
  const navigate = useNavigate(); // <--- ADDED: Hook for navigation

  const [selectedCookie, setSelectedCookie] = useState<CookieData | null>(null);
  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);

  // <--- ADDED: useEffect to show the dialog once on successful login
  useEffect(() => {
    // Check if the URL has a 'fromLogin' parameter to trigger the dialog
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('fromLogin') === 'true' && user) {
      setShowWelcomeDialog(true);
      // Remove the URL parameter after showing to prevent it from showing again on refresh
      navigate(location.pathname, { replace: true });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, navigate, location.search, location.pathname]); // Re-run effect if user or location changes

  // <--- ADDED: useEffect to redirect if user logs out on this page
  useEffect(() => {
    if (!loading && !user) {
      navigate('/signin', { replace: true });
    }
  }, [user, loading, navigate]);

  const handleQuantityChange = (cookieId: string, newQuantity: number) => {
    setCart(currentCart => {
      const updatedCart = { ...currentCart };
      if (newQuantity > 0) {
        updatedCart[cookieId] = newQuantity;
      } else {
        delete updatedCart[cookieId];
      }
      return updatedCart;
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-gray-50 font-inter antialiased">
        <div className="text-gray-700 text-xl">Loading authentication...</div>
      </div>
    );
  }

  return (
    <div className="font-inter antialiased">
      {/* Welcome Dialog Box - Now triggered by URL param */}
      {showWelcomeDialog && user && !user.isAnonymous && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-6 z-50">
          <div className="bg-white p-8 rounded-3xl shadow-xl text-center space-y-4 relative w-full max-w-md">
            <h3 className="text-3xl font-extrabold text-gray-800">Welcome, {user.displayName || user.email || "Cookie Lover"}!</h3>
            <p className="text-lg text-gray-600">We're so happy to have you back.</p>
            <button
              onClick={() => setShowWelcomeDialog(false)}
              className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all duration-200"
            >
              Start Shopping
            </button>
          </div>
        </div>
      )}
      {/* Hero component */}
      <Hero />

      {/* Reviews placed under hero and before cookie collections */}
      <ReviewsSection />

      {/* Main content for cookie gallery */}
      <main id="cookie-gallery-section" className="py-16 bg-gradient-to-br from-gray-50 to-blue-50 relative overflow-hidden">
        {/* ... decorative elements ... */}
        <div className="absolute top-10 left-10 w-24 h-24 bg-pink-100 rounded-full opacity-50 blur-xl animate-pulse-slow"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-teal-100 rounded-full opacity-50 blur-xl animate-pulse-slow delay-500"></div>
        <div className="absolute top-1/3 right-1/4 w-16 h-16 bg-blue-100 rounded-full opacity-50 blur-xl animate-pulse-slow delay-1000"></div>

        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <h2 className="text-4xl font-extrabold text-center text-gray-800 mb-12">Our Signature Collection</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
            {cookieList.map(cookie => (
              <CookieCard
                key={cookie.id}
                cookie={cookie}
                quantity={cart[cookie.id] || 0}
                onChange={(newQty) => handleQuantityChange(cookie.id, newQty)}
                onShowDetails={() => setSelectedCookie(cookie)}
              />
            ))}
          </div>
        </div>
      </main>

      {/* Cookie Details Modal */}
      <CookieDetailsModal
        cookie={selectedCookie}
        onClose={() => setSelectedCookie(null)}
      />

      {/* FOOTER SECTION - START */}
      <footer className="relative w-full bg-gradient-to-b from-slate-900 to-zinc-950 text-slate-300 pt-16 pb-10 px-4 sm:px-6 lg:px-8 font-inter antialiased">
        <div className="absolute inset-x-0 -top-px h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
          {/* Brand & Contact */}
          <div>
            <h3 className="text-2xl font-extrabold text-white tracking-tight">Cookie Gallery</h3>
            <p className="mt-3 text-sm text-slate-300/90 leading-relaxed">
              Handcrafted delights baked with love and the finest ingredients.
            </p>
            <ul className="mt-4 space-y-2 text-sm">
              <li className="flex items-center gap-3"><FiMapPin className="text-rose-300" /> Hyderabad, IN</li>
              <li className="flex items-center gap-3"><FiPhone className="text-rose-300" /> +91-98765-43210</li>
              <li className="flex items-center gap-3"><FiMail className="text-rose-300" /> hello@cookie.gallery</li>
            </ul>
            <p className="mt-4 text-xs opacity-70">FSSAI Lic No. 21004567891023</p>
            <p className="text-xs opacity-70">© {new Date().getFullYear()} Cookie Gallery. All Rights Reserved.</p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold tracking-widest text-slate-400 uppercase">Quick Links</h3>
            <ul className="mt-4 space-y-2 text-base">
              <li><Link to="/" className="hover:text-rose-300 transition-colors">Home</Link></li>
              <li><Link to="/checkout" className="hover:text-rose-300 transition-colors">Checkout</Link></li>
              <li><Link to="/story" className="hover:text-rose-300 transition-colors">Story</Link></li>
              <li><Link to="/behind-the-scenes" className="hover:text-rose-300 transition-colors">Behind the Scenes</Link></li>
            </ul>
          </div>

          {/* Newsletter & Social */}
          <div className="md:justify-self-end">
            <h3 className="text-sm font-semibold tracking-widest text-slate-400 uppercase">Stay in the loop</h3>
            <form className="mt-4 flex w-full max-w-sm rounded-xl overflow-hidden border border-white/10 bg-white/5 backdrop-blur-sm">
              <input
                type="email"
                placeholder="Your email for sweet deals"
                className="w-full px-4 py-3 bg-transparent text-slate-200 placeholder-slate-400 focus:outline-none"
              />
              <button
                type="submit"
                className="px-4 py-3 font-semibold bg-rose-500/90 hover:bg-rose-500 text-white transition-colors"
              >
                Subscribe
              </button>
            </form>
            <div className="mt-6 flex items-center gap-4">
              <a href="#" aria-label="Instagram" className="p-2 rounded-full bg-white/5 hover:bg-white/10 ring-1 ring-white/10 transition-all text-pink-500 text-2xl"><FaInstagram /></a>
              <a href="#" aria-label="X" className="p-2 rounded-full bg-white/5 hover:bg-white/10 ring-1 ring-white/10 transition-all text-black text-2xl"><FaXTwitter /></a>
              <a href="#" aria-label="Facebook" className="p-2 rounded-full bg-white/5 hover:bg-white/10 ring-1 ring-white/10 transition-all text-blue-500 text-2xl"><FaFacebook /></a>
            </div>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-white/10 flex flex-col md:flex-row items-center justify-between gap-3 text-sm">
          <p className="opacity-70">"Life is what you bake it!"</p>
          <div className="text-xs">
            <Link to="/privacy" className="underline underline-offset-2 hover:text-rose-300 transition-colors">Privacy Policy</Link>
          </div>
        </div>
      </footer>
      {/* FOOTER SECTION - END */}
    </div>
  );
}
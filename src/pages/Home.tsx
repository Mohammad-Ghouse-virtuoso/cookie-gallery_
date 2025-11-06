import { useState, useEffect } from 'react';
import type { CookieData } from '../data/cookies';
import { useCart } from '../context/CartContext';
import { FaInstagram, FaFacebook } from 'react-icons/fa'; // Ensure react-icons is installed
import { FaXTwitter } from 'react-icons/fa6';
import { FiMail, FiPhone, FiMapPin } from 'react-icons/fi';
import { Link, useLocation, useNavigate } from 'react-router-dom'; // <--- ADDED: useLocation, useNavigate
import { useAuth } from '../context/AuthContext'; // Use AuthContext

// Importing the separate components
import Hero from '../components/Hero';
import CookieDetailsModal from '../components/CookieDetailModal';
import ReviewsSection from '../components/ReviewsSection';
import BestsellerCarousel from '../components/BestsellerCarousel';
import FestiveBanner from '../components/FestiveBanner';
import SectionDivider from '../components/SectionDivider';
import Accordion, { AccordionItem } from '../components/Accordion';


export default function Home() {
  useCart();
  const { user, loading, authDisabled } = useAuth(); // <--- ADDED: Get user, loading state, and authDisabled
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
   
  }, [user, navigate, location.search, location.pathname]); // Re-run effect if user or location changes

  // <--- ADDED: useEffect to redirect if user logs out on this page
  useEffect(() => {
    if (!loading && !user && !authDisabled) {
      navigate('/signin', { replace: true });
    }
  }, [user, loading, authDisabled, navigate]);

  // Reserved for future quick-add widgets

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
        <div 
          className="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center p-6 z-50"
          role="dialog"
          aria-labelledby="welcome-dialog-title"
          aria-modal="true"
        >
          <div className="bg-white p-8 rounded-3xl shadow-xl text-center space-y-4 relative w-full max-w-md">
            <h3 id="welcome-dialog-title" className="text-3xl font-extrabold text-gray-800">
              Welcome, {user.displayName || user.email || "Cookie Lover"}!
            </h3>
            <p className="text-lg text-gray-600">We're so happy to have you back.</p>
            <button
              onClick={() => setShowWelcomeDialog(false)}
              className="bg-[color:#5b3a20] hover:bg-[color:#6a4629] text-white font-bold py-2 px-6 rounded-xl shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-[color:#dba661] focus:ring-offset-2"
              type="button"
            >
              Start Shopping
            </button>
          </div>
        </div>
      )}
      {/* Hero component */}
      <Hero />

  {/* Festive Banner - The Golden Season */}
  <FestiveBanner />

  {/* Decorative typographic divider */}
  <SectionDivider color="#dba661" />

      {/* Best Sellers section directly under Hero */}
      <section className="pt-12 pb-8">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <div className="inline-block">
              <h2 className="text-3xl md:text-4xl font-extrabold text-amber-900/90 mb-2 opacity-0 animate-fade-in">Best Sellers</h2>
              <p className="text-lg text-stone-700 opacity-0 animate-fade-in animation-delay-200">Crowd favorites, baked to steal the spotlight.</p>
            </div>
          </div>
        </div>
      </section>

      <BestsellerCarousel />

      {/* Reviews placed under hero and before cookie collections */}
      <ReviewsSection />

      {/* Explore CTA — placed after testimonials */}
      <section className="relative py-10 sm:py-14">
        <div className="max-w-6xl mx-auto px-6">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#fffaf3] via-[#f8eddc] to-[#f5e8d8] ring-1 ring-amber-200/40 shadow-[0_10px_40px_-15px_rgba(0,0,0,0.15)]">
            {/* Accent vignette */}
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-[color:#f1b55c]/15 via-transparent to-transparent" aria-hidden="true" />
            <div className="relative px-6 sm:px-10 py-10 sm:py-14 grid gap-6 sm:gap-8 md:grid-cols-[1.2fr_auto] items-center">
              <div>
                <h3 className="text-3xl sm:text-4xl font-black tracking-tight text-[color:#5b3a20]" style={{ textShadow: '0 1px 2px rgba(0,0,0,0.08)' }}>
                  Ready to explore the full collection?
                </h3>
                <p className="mt-3 text-base sm:text-lg text-[color:#8a5a3a] leading-relaxed">
                  Discover seasonal specials, curated boxes, and every beloved classic — all baked to perfection.
                </p>
              </div>
              <div className="md:justify-self-end">
                <Link
                  to="/cookies"
                  aria-label="Explore the complete cookie catalogue"
                  className="inline-flex items-center gap-2 rounded-2xl px-6 py-3.5 font-semibold text-[#5b3a20] 
                             shadow-[0_4px_16px_rgba(0,0,0,0.1)] 
                             hover:shadow-[0_0_24px_rgba(241,181,92,0.35),0_6px_20px_rgba(0,0,0,0.15)] 
                             focus:outline-none focus-visible:ring-2 focus-visible:ring-[#f1b55c] focus-visible:ring-offset-2 
                             transition-all duration-300 hover:-translate-y-0.5 hover:scale-[1.03]
                             ring-2 ring-[#dba661]/40 hover:ring-[#f1b55c]/50"
                  style={{ background: 'linear-gradient(135deg, #e8b875 0%, #dba661 100%)' }}
                >
                  <span>Explore the Catalogue</span>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    className="w-5 h-5"
                    aria-hidden="true"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              </div>
            </div>
            {/* Bottom gradient accent line */}
            <div className="pointer-events-none h-px w-full bg-gradient-to-r from-transparent via-[color:#dba661] to-transparent" aria-hidden="true" />
          </div>
        </div>
      </section>

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
              <li className="flex items-center gap-3"><FiMapPin className="text-[color:#dba661]" /> Hyderabad, IN</li>
              <li className="flex items-center gap-3"><FiPhone className="text-[color:#dba661]" /> +91-98765-43210</li>
              <li className="flex items-center gap-3"><FiMail className="text-[color:#dba661]" /> hello@cookie.gallery</li>
            </ul>
            <p className="mt-4 text-xs opacity-70">FSSAI Lic No. 21004567891023</p>
            <p className="text-xs opacity-70">© {new Date().getFullYear()} Cookie Gallery. All Rights Reserved.</p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-sm font-semibold tracking-widest text-slate-400 uppercase">Quick Links</h3>
            <ul className="mt-4 space-y-2 text-base">
              <li><Link to="/" className="hover:text-[color:#dba661] transition-colors">Home</Link></li>
              <li><Link to="/checkout" className="hover:text-[color:#dba661] transition-colors">Checkout</Link></li>
              <li><Link to="/story" className="hover:text-[color:#dba661] transition-colors">Story</Link></li>
              <li><Link to="/behind-the-scenes" className="hover:text-[color:#dba661] transition-colors">Behind the Scenes</Link></li>
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
                className="px-4 py-3 font-semibold text-white transition-colors rounded-r-xl"
                style={{ backgroundColor: '#5b3a20' }}
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
        <div className="max-w-7xl mx-auto mt-10 pt-6 border-t border-white/10 flex flex-col items-start gap-6 text-sm">
          {/* FAQ Accordion */}
          <div className="w-full">
            <h4 className="text-white font-semibold mb-3">FAQ</h4>
            <div className="bg-white/3 p-3 rounded-lg">
              <Accordion variant="light">
                <AccordionItem key="faq1" aria-label="How long do cookies stay fresh?" title="How long do cookies stay fresh?">
                  Our cookies are best enjoyed within 5–7 days. Store them in an airtight container at room temperature for optimal texture.
                </AccordionItem>
                <AccordionItem key="faq2" aria-label="Do you offer vegan options?" title="Do you offer vegan options?">
                  Yes — we have selected vegan-friendly recipes. Check the filter 'Vegan' in our catalogue to see available options.
                </AccordionItem>
                <AccordionItem key="faq3" aria-label="Can I customize an order?" title="Can I customize an order?">
                  Custom packs are available for bulk orders. Contact us via hello@cookie.gallery and we'll walk you through options and lead times.
                </AccordionItem>
                <AccordionItem key="faq4" aria-label="What about allergies?" title="What about allergies?">
                  We label common allergens clearly on each product. If you have severe allergies, please contact us before ordering so we can advise.
                </AccordionItem>
              </Accordion>
            </div>
          </div>

          <div className="w-full md:w-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <p className="opacity-70">"Life is what you bake it!"</p>
            <div className="text-xs">
              <Link to="/privacy" className="underline underline-offset-2 hover:text-[color:#dba661] transition-colors">Privacy Policy</Link>
            </div>
          </div>
        </div>
      </footer>
      {/* FOOTER SECTION - END */}
    </div>
  );
}
// src/App.tsx

import { useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, useNavigate } from "react-router-dom";

// Import all of your components
import NavBar from "./components/NavBar";
import Home from "./pages/Home";
import CookieCatalogue from "./pages/CookieCatalogue";
import CheckoutLegacy from "./pages/CheckOut";
import CheckoutPage from "./pages/CheckoutPage";
import OrderSuccess from "./pages/OrderSuccess";
import SignIn from "./pages/SignIn";
import SignedOut from "./pages/Signout";
import ProtectedRoutes from "./components/ProtectedRoutes";
import Story from "./pages/Story";
import BehindTheScenes from "./pages/BehindTheScenes";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ProductDetailPage from "./pages/ProductDetailPage";
import GoldenSeason from "./pages/GoldenSeason";
import GiftModal from "./components/gifting/GiftModal";
import GiftExperiencePage from "./pages/gift/GiftExperiencePage";
import CheckoutAddressPage from "./pages/checkout/CheckoutAddress";
import PaymentStatusPage from "./pages/PaymentStatus";
import Receipt from "./pages/Receipt";
import OrdersPage from "./pages/OrdersPage";
import SocialComingSoon from "./pages/SocialComingSoon";
import NotFound from "./pages/NotFound";
import { checkoutPageEnabled } from "./config/features";
import CartPersistenceBanner from "./components/CartPersistenceBanner";
import MaintenanceBanner from "./components/MaintenanceBanner";
import { Analytics } from "@vercel/analytics/react";

// Import AuthProvider
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { GiftExperienceProvider } from "./context/GiftExperienceContext";

// New component to handle conditional layout
function CheckoutAddressRedirect() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate('/checkout#address', { replace: true });
  }, [navigate]);

  return null;
}

function AppContent() {
  const location = useLocation();
  // Check if the current path is the sign-in or signed-out page
  const hideNav = location.pathname === '/signin' || location.pathname === '/signed-out';

  return (
    <>
      {/* Site-wide maintenance/notice banner - toggle in MaintenanceBanner.tsx */}
      <MaintenanceBanner />
      {/* Conditionally render the NavBar based on the current URL */}
      {!hideNav && <NavBar />}
      {/* Show cart persistence banner on first visit */}
      {!hideNav && <CartPersistenceBanner />}

      <Routes>
        {/* Unprotected routes (no auth required) */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signed-out" element={<SignedOut />} />
        <Route path="/order-success" element={<OrderSuccess />} />
        <Route path="/receipt" element={<Receipt />} />
        <Route path="/social/:platform" element={<SocialComingSoon />} />
        
        {/* Protected routes (require sign-in OR guest mode) */}
        <Route path="/" element={<ProtectedRoutes />}>
          <Route index element={<Home />} />
          <Route path="home" element={<Home />} />
          <Route path="cookies" element={<CookieCatalogue />} />
          <Route path="product/:cookieId" element={<ProductDetailPage />} />
          <Route
            path="checkout"
            element={checkoutPageEnabled ? <CheckoutPage /> : <CheckoutLegacy />}
          />
          <Route
            path="checkout/address"
            element={checkoutPageEnabled ? <CheckoutAddressRedirect /> : <CheckoutAddressPage />}
          />
          <Route path="payment-status" element={<PaymentStatusPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="story" element={<Story />} />
          <Route path="behind-the-scenes" element={<BehindTheScenes />} />
          <Route path="privacy" element={<PrivacyPolicy />} />
          <Route path="golden-season" element={<GoldenSeason />} />
          <Route path="gift/:boxId" element={<GiftExperiencePage />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

// The main App component that wraps everything with providers
function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <CartProvider>
          <GiftExperienceProvider>
            <AppContent />
            <GiftModal />
            <Analytics />
          </GiftExperienceProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
// src/App.tsx

import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

// Import all of your components
import NavBar from "./components/NavBar";
import Home from "./pages/Home";
import CookieCatalogue from "./pages/CookieCatalogue";
import Checkout from "./pages/CheckOut";
import OrderSuccess from "./pages/OrderSuccess";
import SignIn from "./pages/SignIn";
import SignedOut from "./pages/Signout";
import ProtectedRoutes from "./components/ProtectedRoutes";
import Story from "./pages/Story";
import BehindTheScenes from "./pages/BehindTheScenes";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import ProductDetailPage from "./pages/ProductDetailPage.tsx";
import GoldenSeason from "./pages/GoldenSeason";
import GiftModal from "./components/gifting/GiftModal";
import GiftExperiencePage from "./pages/gift/GiftExperiencePage";
import CheckoutAddressPage from "./pages/checkout/CheckoutAddress";

// Import AuthProvider
import { AuthProvider } from "./context/AuthContext";
import { CartProvider } from "./context/CartContext";
import { GiftExperienceProvider } from "./context/GiftExperienceContext";

// New component to handle conditional layout
function AppContent() {
  const location = useLocation();
  // Check if the current path is the sign-in or signed-out page
  const hideNav = location.pathname === '/signin' || location.pathname === '/signed-out';

  return (
    <>
      {/* Conditionally render the NavBar based on the current URL */}
      {!hideNav && <NavBar />}

      <Routes>
        {/* Unprotected routes (don't have a NavBar) */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signed-out" element={<SignedOut />} />
        <Route path="/order-success" element={<OrderSuccess />} />

        {/* Protected routes (these will have the NavBar rendered) */}
        <Route path="/" element={<ProtectedRoutes />}>
          {/* Explicit home route to support navigate('/home') after sign-in */}
          <Route index element={<Home />} />
          <Route path="home" element={<Home />} />
          <Route path="cookies" element={<CookieCatalogue />} />
          <Route path="product/:cookieId" element={<ProductDetailPage />} />
          <Route path="checkout" element={<Checkout />} />
          <Route path="checkout/address" element={<CheckoutAddressPage />} />
          <Route path="story" element={<Story />} />
          <Route path="behind-the-scenes" element={<BehindTheScenes />} />
          <Route path="privacy" element={<PrivacyPolicy />} />
          <Route path="golden-season" element={<GoldenSeason />} />
          <Route path="gift/:boxId" element={<GiftExperiencePage />} />
        </Route>
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
          </GiftExperienceProvider>
        </CartProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
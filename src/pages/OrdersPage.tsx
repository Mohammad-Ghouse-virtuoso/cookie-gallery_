// src/pages/OrdersPage.tsx

import { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { FiPackage, FiMapPin, FiChevronDown, FiChevronUp, FiEdit2, FiShoppingBag, FiLoader } from 'react-icons/fi';
import { FcGoogle } from 'react-icons/fc';
import { isTestPhoneUser, getAuthMethod, getAuthMethodLabel } from '@/utils/isTestUser';
import { getSessionOrders, type SessionOrder } from '@/lib/sessionOrderStorage';
import { loadCheckoutAddress, hasCheckoutAddress } from '@/lib/checkoutAddressStorage';
import { formatPrice } from '@/utils/formatPrice';
import cookieIllustration from '@/assets/Cookie-Hero Card.png';

// Order accordion item component
function OrderAccordion({ order, defaultExpanded = false }: { order: SessionOrder; defaultExpanded?: boolean }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  
  const formattedDate = useMemo(() => {
    try {
      return new Date(order.createdAt).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return 'Recent order';
    }
  }, [order.createdAt]);

  return (
    <div className="bg-white rounded-2xl border border-[#E2B97F]/30 shadow-sm overflow-hidden transition-shadow duration-200 hover:shadow-md">
      {/* Accordion Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 sm:p-5 text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-[#dba661] focus-visible:ring-inset"
        aria-expanded={isExpanded}
      >
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#FBE9DA] to-[#F8DDCA] flex items-center justify-center">
            <FiPackage className="w-6 h-6 text-[#C47A41]" />
          </div>
          <div>
            <p className="font-semibold text-[#3B2B1A] text-sm sm:text-base">
              {order.itemCount} {order.itemCount === 1 ? 'item' : 'items'} • {formatPrice(order.totalAmount)}
            </p>
            <p className="text-xs sm:text-sm text-gray-500 mt-0.5">{formattedDate}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="px-2.5 py-1 text-xs font-medium bg-green-100 text-green-700 rounded-full">
            Paid
          </span>
          {isExpanded ? (
            <FiChevronUp className="w-5 h-5 text-gray-400" />
          ) : (
            <FiChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>
      
      {/* Accordion Content */}
      {isExpanded && (
        <div className="px-4 sm:px-5 pb-4 sm:pb-5 border-t border-[#F8EDDC]">
          <ul className="divide-y divide-[#F8EDDC]">
            {order.items.map((item) => (
              <li key={item.id} className="flex items-center gap-3 py-3 first:pt-4">
                {item.image ? (
                  <img 
                    src={item.image} 
                    alt={item.name} 
                    className="w-12 h-12 rounded-lg object-cover bg-[#FBE9DA]" 
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-[#FBE9DA] flex items-center justify-center text-sm font-semibold text-[#C47A41]">
                    {item.name.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[#3B2B1A] text-sm truncate">{item.name}</p>
                  <p className="text-xs text-gray-500">Qty: {item.qty}</p>
                </div>
                <p className="font-semibold text-[#3B2B1A] text-sm">{formatPrice(item.price * item.qty)}</p>
              </li>
            ))}
          </ul>
          
          <div className="mt-4 pt-4 border-t border-[#F8EDDC] flex justify-between items-center">
            <span className="text-sm text-gray-600">Order Total</span>
            <span className="font-bold text-[#3B2B1A]">{formatPrice(order.totalAmount)}</span>
          </div>
          
          <p className="mt-3 text-xs text-gray-400 font-mono truncate">
            Order ID: {order.orderId.slice(0, 20)}...
          </p>
        </div>
      )}
    </div>
  );
}

// Empty state component
function EmptyOrdersState({ isTestUser }: { isTestUser: boolean }) {
  return (
    <div className="text-center py-12 px-4">
      <div className="w-32 h-32 mx-auto mb-6 rounded-full bg-gradient-to-br from-[#FFF9F0] to-[#FBE9DA] flex items-center justify-center">
        <img src={cookieIllustration} alt="Cookie" className="w-20 h-20 object-contain opacity-80" />
      </div>
      
      {isTestUser ? (
        <>
          <h3 className="text-xl font-bold text-[#3B2B1A] mb-2">Demo Mode Active 🍪</h3>
          <p className="text-gray-600 max-w-sm mx-auto mb-6">
            Orders in demo mode are like cookies fresh from the oven—enjoy them now! 
            Place an order to see it appear here.
          </p>
          <p className="text-sm text-[#C47A41] max-w-xs mx-auto">
            💡 Sign in with Google for your personalized bakery journal
          </p>
        </>
      ) : (
        <>
          <h3 className="text-xl font-bold text-[#3B2B1A] mb-2">No orders yet</h3>
          <p className="text-gray-600 max-w-sm mx-auto mb-6">
            Your order history will appear here after your first purchase. 
            Ready to treat yourself?
          </p>
        </>
      )}
      
      <Link
        to="/cookies"
        className="inline-flex items-center gap-2 mt-4 px-6 py-3 bg-gradient-to-br from-[#D9845A] via-[#C97550] to-[#B86648] text-white rounded-xl font-semibold shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
      >
        <FiShoppingBag className="w-5 h-5" />
        Browse Cookies
      </Link>
    </div>
  );
}

// Demo mode banner for test users
function DemoModeBanner({ onSignInWithGoogle }: { onSignInWithGoogle?: () => void }) {
  return (
    <div className="mb-6 p-4 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 rounded-2xl">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-400 flex items-center justify-center flex-shrink-0">
          <span className="text-xl">🍪</span>
        </div>
        <div className="flex-1">
          <h4 className="font-semibold text-amber-900">Hey, it's Demo Mode!</h4>
          <p className="text-sm text-amber-700 mt-0.5 mb-3">
            Order a few cookies to see your orders here. Demo orders are session-only—like cookies fresh from the oven, enjoy them now!
          </p>
          {onSignInWithGoogle && (
            <button
              onClick={onSignInWithGoogle}
              className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
            >
              <FcGoogle className="w-4 h-4" />
              Sign in with Google for full experience
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Fetch orders from Firestore API
async function fetchFirestoreOrders(idToken: string): Promise<SessionOrder[]> {
  const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000';
  
  try {
    const response = await fetch(`${API_BASE}/api/user-orders`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const data = await response.json();
    return data.orders || [];
  } catch (error) {
    console.error('Failed to fetch orders from Firestore:', error);
    return [];
  }
}

export default function OrdersPage() {
  const { user, signInWithGoogle } = useAuth();
  const [firestoreOrders, setFirestoreOrders] = useState<SessionOrder[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [ordersSource, setOrdersSource] = useState<'session' | 'firestore'>('session');
  
  // Determine if user is a test phone user
  const isTestUser = useMemo(() => isTestPhoneUser(user?.phoneNumber), [user?.phoneNumber]);
  const isGoogleUser = useMemo(() => !!user?.email && !isTestUser, [user?.email, isTestUser]);
  const authMethod = useMemo(() => getAuthMethod(user), [user]);
  const authLabel = getAuthMethodLabel(authMethod);
  
  // Get session-scoped orders
  const sessionOrders = useMemo(() => getSessionOrders(), []);
  
  // Load saved address (user-scoped via ownerId)
  const savedAddress = useMemo(() => loadCheckoutAddress(user?.uid), [user?.uid]);
  const hasAddress = useMemo(() => hasCheckoutAddress(user?.uid), [user?.uid]);
  
  // Fetch Firestore orders for Google users
  useEffect(() => {
    if (isGoogleUser && user) {
      setIsLoadingOrders(true);
      user.getIdToken()
        .then(token => fetchFirestoreOrders(token))
        .then(orders => {
          setFirestoreOrders(orders);
          setOrdersSource('firestore');
        })
        .catch(err => {
          console.error('Error fetching Firestore orders:', err);
          setOrdersSource('session');
        })
        .finally(() => setIsLoadingOrders(false));
    }
  }, [isGoogleUser, user]);
  
  // For Google users: show Firestore orders, for test users: show session orders
  const orders = isGoogleUser ? firestoreOrders : sessionOrders;
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFBF7] to-[#FDF6EC]">
      <div className="max-w-4xl mx-auto px-4 py-8 sm:py-12">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold text-[#3B2B1A] mb-2" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
            My Orders
          </h1>
          <p className="text-gray-600">Track your cookie orders and manage your profile</p>
        </div>
        
        {/* Demo Mode Banner for test users */}
        {isTestUser && <DemoModeBanner onSignInWithGoogle={signInWithGoogle} />}
        
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Profile Sidebar */}
          <aside className="lg:col-span-1">
            <div className="bg-white rounded-2xl border border-[#E2B97F]/30 shadow-sm p-5 sticky top-24">
              {/* User Avatar & Info */}
              <div className="text-center mb-5">
                {user?.photoURL ? (
                  <img 
                    src={user.photoURL} 
                    alt="Profile" 
                    className="w-20 h-20 rounded-full object-cover mx-auto ring-4 ring-[#FBE9DA] shadow-sm"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#5b3a20] to-[#8B5A2B] text-white text-2xl font-bold flex items-center justify-center mx-auto shadow-sm">
                    {(user?.displayName || user?.email || user?.phoneNumber || 'G').slice(0, 1).toUpperCase()}
                  </div>
                )}
                <h2 className="mt-3 font-semibold text-[#3B2B1A] text-lg">
                  {user?.displayName || 'Cookie Lover'}
                </h2>
                <p className="text-sm text-gray-500 truncate px-2">
                  {user?.email || user?.phoneNumber || 'Guest'}
                </p>
                <span className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 text-xs font-medium bg-[#FBE9DA] text-[#8B5A2B] rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C47A41]" />
                  Signed in via {authLabel}
                </span>
              </div>
              
              {/* Sign in with Google prompt for test users */}
              {isTestUser && (
                <div className="border-t border-[#F8EDDC] pt-4 mb-4">
                  <p className="text-xs text-gray-500 mb-3 text-center">
                    Want to save your orders across sessions?
                  </p>
                  <button
                    onClick={signInWithGoogle}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
                  >
                    <FcGoogle className="w-5 h-5" />
                    Sign in with Google
                  </button>
                </div>
              )}
              
              {/* Saved Address Section */}
              <div className="border-t border-[#F8EDDC] pt-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-[#3B2B1A] text-sm flex items-center gap-2">
                    <FiMapPin className="w-4 h-4 text-[#C47A41]" />
                    Saved Address
                  </h3>
                  {hasAddress && (
                    <Link
                      to="/checkout#address"
                      className="text-xs text-[#C47A41] hover:text-[#A66A35] flex items-center gap-1 transition-colors"
                    >
                      <FiEdit2 className="w-3 h-3" />
                      Edit
                    </Link>
                  )}
                </div>
                
                {hasAddress && savedAddress ? (
                  <div className="text-sm text-gray-600 space-y-1 bg-[#FDFAF5] rounded-xl p-3">
                    <p className="font-medium text-[#3B2B1A]">{savedAddress.fullName}</p>
                    <p>{savedAddress.line1}</p>
                    {savedAddress.line2 && <p>{savedAddress.line2}</p>}
                    <p>{savedAddress.city}, {savedAddress.state} {savedAddress.postalCode}</p>
                    <p className="text-gray-400">{savedAddress.phone}</p>
                  </div>
                ) : (
                  <div className="text-center py-4 bg-[#FDFAF5] rounded-xl">
                    <p className="text-sm text-gray-500 mb-2">No address saved yet</p>
                    <Link
                      to="/checkout#address"
                      className="text-sm text-[#C47A41] hover:text-[#A66A35] font-medium transition-colors"
                    >
                      Add address →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          </aside>
          
          {/* Orders Content */}
          <main className="lg:col-span-2 space-y-4">
            {isLoadingOrders ? (
              <div className="text-center py-12">
                <FiLoader className="w-8 h-8 text-[#C47A41] animate-spin mx-auto mb-4" />
                <p className="text-gray-600">Loading your orders...</p>
              </div>
            ) : orders.length > 0 ? (
              <>
                <p className="text-sm text-gray-500 mb-4">
                  Showing {orders.length} {orders.length === 1 ? 'order' : 'orders'}
                  {isGoogleUser && ordersSource === 'firestore' && ' from your account'}
                  {isTestUser && ' from this session'}
                </p>
                {orders.map((order, index) => (
                  <OrderAccordion 
                    key={order.orderId} 
                    order={order} 
                    defaultExpanded={index === 0}
                  />
                ))}
              </>
            ) : (
              <EmptyOrdersState isTestUser={isTestUser} />
            )}
          </main>
        </div>
      </div>
    </div>
  );
}

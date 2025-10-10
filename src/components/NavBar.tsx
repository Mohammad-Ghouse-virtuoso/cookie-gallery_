// src/components/NavBar.tsx

import { Link, useNavigate } from 'react-router-dom';
import { FaCookieBite } from 'react-icons/fa';
import { useAuth } from '../context/AuthContext';

export default function NavBar() {
  const { user, loading, signOutUser } = useAuth();
  const navigate = useNavigate();

  const handleSignOutClick = async () => {
    try {
      await signOutUser();
      navigate('/signed-out');
    } catch (error) {
      console.error("Error signing out from NavBar:", error);
    }
  };

  return (
    <nav className="bg-white shadow-md py-4 px-6 sm:px-8 flex items-center justify-between sticky top-0 z-50 font-inter antialiased">
      {/* Logo and Site Title */}
      <div className="flex items-center space-x-2">
        <FaCookieBite className="text-indigo-400 text-3xl" />
        <Link to="/" className="text-2xl font-extrabold text-gray-800 hover:text-indigo-700 transition-colors">
          Cookie Gallery 🍪
        </Link>
      </div>

      {/* Navigation Links */}
      <div className="flex items-center space-x-2 sm:space-x-4">
        {/* Hide links while auth loading or when user is not logged in */}
        {loading || !user ? (
          <Link
            to="/signin"
            className="px-5 py-2 sm:px-4 sm:py-2 rounded-full text-gray-800 bg-orange-200 font-bold transition-all duration-200 text-base sm:text-lg hover:bg-orange-300"
          >
            Sign In
          </Link>
        ) : (
          <>
            <Link
              to="/"
              className="px-5 py-2 sm:px-4 sm:py-2 rounded-full text-gray-700 hover:bg-orange-200 hover:text-indigo-800 font-medium transition-all duration-200 text-base sm:text-lg"
            >
              Home
            </Link>
            <Link
              to="/checkout"
              className="px-3 py-2 sm:px-4 sm:py-2 rounded-full text-gray-700 hover:bg-orange-200 hover:text-indigo-800 font-medium transition-all duration-200 text-base sm:text-lg"
            >
              My Cart
            </Link>

            {/* Signed-in identity avatar (hover to reveal email) */}
            <div className="relative group select-none">
              {user?.photoURL ? (
                <img src={user.photoURL} alt="avatar" className="w-9 h-9 rounded-full object-cover shadow-sm ring-2 ring-white" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-indigo-600 text-white font-semibold flex items-center justify-center shadow-sm">
                  {(user?.email || 'C').slice(0,1).toUpperCase()}
                </div>
              )}
              <div className="absolute -left-2 top-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none bg-white text-gray-700 text-xs px-3 py-2 rounded-lg shadow-md whitespace-nowrap border border-gray-200">
                {user?.email || 'Signed in'}
              </div>
            </div>


            {/* Sign Out Button when logged in */}
            <button
              onClick={handleSignOutClick}
              className="px-5 py-2 sm:px-4 sm:py-2 rounded-full text-white bg-red-500 font-bold transition-all duration-200 text-base sm:text-lg hover:bg-red-600"
            >
              Sign Out
            </button>
          </>
        )}
      </div>
    </nav>
  );
}
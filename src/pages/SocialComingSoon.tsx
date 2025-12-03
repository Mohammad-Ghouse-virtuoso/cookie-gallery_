// src/pages/SocialComingSoon.tsx

import { useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FaInstagram, FaFacebook } from 'react-icons/fa';
import { FaXTwitter } from 'react-icons/fa6';
import { FiArrowLeft } from 'react-icons/fi';
import { GiCookie } from 'react-icons/gi';

type SocialPlatform = 'instagram' | 'x' | 'facebook';

interface PlatformContent {
  icon: React.ReactNode;
  name: string;
  bgGradient: string;
  message: string;
  subMessage: string;
  emoji: string;
}

const platformContent: Record<SocialPlatform, PlatformContent> = {
  instagram: {
    icon: <FaInstagram className="w-16 h-16" />,
    name: 'Instagram',
    bgGradient: 'from-purple-500 via-pink-500 to-orange-400',
    message: "Our cookies are too busy being delicious to pose for the 'gram... yet!",
    subMessage: "We're baking up some picture-perfect content. Follow us soon for behind-the-scenes dough therapy and cookie glamour shots! 📸🍪",
    emoji: '✨'
  },
  x: {
    icon: <FaXTwitter className="w-16 h-16" />,
    name: 'X (Twitter)',
    bgGradient: 'from-gray-800 to-gray-900',
    message: "We're still drafting our first tweet... it has to be crumb-believable!",
    subMessage: "Hot takes on cookie culture coming soon. We promise our tweets will be as crispy as our edges and as soft as our centers. 🐦🍪",
    emoji: '🔥'
  },
  facebook: {
    icon: <FaFacebook className="w-16 h-16" />,
    name: 'Facebook',
    bgGradient: 'from-blue-600 to-blue-700',
    message: "Our Facebook page is still in the oven—needs a few more minutes!",
    subMessage: "Soon you'll be able to like, share, and tag your friends in our cookie madness. Because good cookies deserve good company! 👥🍪",
    emoji: '👍'
  }
};

export default function SocialComingSoon() {
  const { platform } = useParams<{ platform: string }>();
  const content = platformContent[platform as SocialPlatform] || platformContent.instagram;

  // Scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#FFFBF7] to-[#FDF6EC] flex items-center justify-center px-4 py-12">
      <div className="max-w-lg w-full text-center">
        {/* Animated Icon */}
        <div className={`inline-flex items-center justify-center w-28 h-28 rounded-full bg-gradient-to-br ${content.bgGradient} text-white mb-8 shadow-xl animate-bounce`}>
          {content.icon}
        </div>

        {/* Platform Name */}
        <h1 className="text-3xl sm:text-4xl font-bold text-[#3B2B1A] mb-4" style={{ fontFamily: '"Playfair Display", Georgia, serif' }}>
          {content.name} {content.emoji}
        </h1>

        {/* Main Message */}
        <p className="text-xl text-[#5b3a20] font-medium mb-4 leading-relaxed">
          {content.message}
        </p>

        {/* Sub Message */}
        <p className="text-gray-600 mb-8 leading-relaxed">
          {content.subMessage}
        </p>

        {/* Cookie Animation */}
        <div className="flex justify-center items-center gap-2 mb-8">
          <GiCookie className="w-6 h-6 text-[#C47A41] animate-pulse" />
          <span className="text-sm text-gray-500">Freshly baking our social presence...</span>
          <GiCookie className="w-6 h-6 text-[#C47A41] animate-pulse" />
        </div>

        {/* Back Button */}
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-br from-[#D9845A] via-[#C97550] to-[#B86648] text-white rounded-xl font-semibold shadow-md hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200"
        >
          <FiArrowLeft className="w-5 h-5" />
          Back to Cookie Gallery
        </Link>

        {/* Fun Footer */}
        <p className="mt-12 text-xs text-gray-400">
          P.S. While you wait, why not grab a cookie? They don't judge. 🍪
        </p>
      </div>
    </div>
  );
}

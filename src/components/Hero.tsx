import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useState, useRef } from 'react';
// Hero banner image
import heroImage from '../assets/Cookie-Hero Card.png';

export default function Hero() {
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  
  // 3D tilt tracking
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  // Smooth spring animations
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), { stiffness: 300, damping: 30 });
  
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };
  
  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };
  return (
    <section className="relative w-full bg-gradient-to-b from-blue-50 via-gray-50 to-white pt-16 pb-20 font-inter antialiased">
      <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
        {/* Text Content */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7 }}
          className="text-center md:text-left"
        >
          <h1 className="text-4xl md:text-6xl font-extrabold text-zinc-700 leading-tight tracking-tighter">
            Handcrafted Cookies,
            <span className="block text-rose-600">Baked with Love 🩷</span>
          </h1>
          <p className="mt-6 text-lg text-gray-600 max-w-md mx-auto md:mx-0">
            Indulge in our exquisite collection of handcrafted cookies, made with love and the finest ingredients.
          </p>
          {/* CTA removed from Hero per layout update - moved after testimonials */}
        </motion.div>

        {/* Image Content with 3D Tilt Effect */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="flex justify-center"
          style={{ perspective: '1000px' }}
        >
          <motion.div
            ref={cardRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={handleMouseLeave}
            style={{
              rotateX,
              rotateY,
              transformStyle: 'preserve-3d',
            }}
            animate={{
              scale: isHovered ? 1.03 : 1,
            }}
            transition={{
              scale: { duration: 0.3, ease: 'easeOut' },
            }}
            className="relative"
          >
            <img
              src={heroImage}
              alt="An artful platter showcasing a variety of handcrafted cookies including chocolate chip, oatmeal, and specialty flavors"
              width="800"
              height="600"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="w-full max-w-md md:max-w-full rounded-2xl object-cover shadow-[0_20px_60px_rgba(0,0,0,0.25)] ring-1 ring-white/40"
              style={{ 
                transform: 'translateZ(50px)',
                willChange: 'transform',
              }}
            />
          </motion.div>
        </motion.div>
      </div>

      {/* Subtle background shapes for visual appeal */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none" aria-hidden="true">
        <div className="absolute w-64 h-64 bg-indigo-200 rounded-full opacity-20 -top-10 -left-10 blur-2xl"></div>
        <div className="absolute bottom-20 right-20 w-32 h-32 bg-blue-200 rounded-full opacity-15 bottom-0 -right-20 blur-2xl"></div>
      </div>
    </section>
  );
}
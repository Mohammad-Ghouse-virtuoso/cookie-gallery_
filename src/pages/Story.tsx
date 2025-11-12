// src/pages/Story.tsx

import { useEffect, useRef } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';
import baker from '../assets/baker_4.png';
import stall from '../assets/first-stall-new.jpeg';
import bake from '../assets/first-batch1.jpeg';
import homeOven from '../assets/from-oven.jpeg';
import storefront from '../assets/Cookie-gallery-bake.jpeg';
import team from '../assets/CG_Team.jpg';
import community from '../assets/Diwali_community.jpg';
import moments from '../assets/Special-Moments.jpeg';

const sample = [
  { id: '1', image: bake, title: 'The First Batch', subtitle: 'Where it all began', caption: 'An old family recipe, perfected at 2am.' },
  { id: '2', image: homeOven, title: 'From Home Oven', subtitle: 'Handmade with love', caption: 'Small steps with big dreams.' },
  { id: '3', image: stall, title: 'Our First Stall', subtitle: 'Meeting our community', caption: 'Cookies + smiles = magic.' },
  { id: '4', image: storefront, title: 'New Store', subtitle: 'A cozy corner opens', caption: 'From pop-ups to a little home of our own.' },
  { id: '5', image: team, title: 'Our Team', subtitle: 'Hands that craft', caption: 'Early mornings, shared laughs, perfectly baked trays.' },
  { id: '6', image: community, title: 'Community Love', subtitle: 'Friends and food', caption: 'Your smiles, messages, and visits keep us going.' },
  { id: '7', image: moments, title: 'Special Moments', subtitle: 'Milestones & joy', caption: 'Tiny wins, big gratitude. Here’s to many more.' },
];


export default function Story() {
  const trackRef = useRef<HTMLDivElement>(null);
  const scrollBy = (dx: number) => trackRef.current?.scrollBy({ left: dx, behavior: 'smooth' });

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  return (
    <div className="font-inter antialiased">
      {/* Scoped styles for Story page only */}
      <style>{`
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      <section className="bg-gradient-to-b from-blue-50 to-white py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 mb-4">Our Story</h1>
          <p className="text-gray-600 text-lg max-w-3xl">Baked with heart. We started in a tiny kitchen with a single tray, a second-hand oven, and a promise to make every bite feel like home. This is a little slice of our journey.</p>
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-5xl mx-auto px-6 grid md:grid-cols-2 gap-10 items-center">
          <img src={baker} alt="Head baker finishing a tray of cookies" className="rounded-3xl shadow-xl object-cover w-full h-72 md:h-96 border-8 border-rose-200 ring-1 ring-rose-300/40"/>
          <div>
            <h2 className="text-3xl font-extrabold text-rose-400 mb-2">Meet the Baker-queen 👑</h2>
            <p className="text-white-300 leading-relaxed">Hi, I’m the cookie-maker-in-chief. I grew up with the smell of warm butter and vanilla. After gifting cookies to friends, a small Instagram pop-up turned into this humble bakery. Every dough is mixed by hand and every batch is tasted (with great joy!).</p>
            <p className="text-white-700 mt-3">We keep our ingredients clean: real butter, single-origin cocoa, and unbleached flour. We whisk in gratitude and pack with care.</p>
          </div>
        </div>
      </section>

      <section className="py-12 bg-gradient-to-b from-white to-blue-50">
        <div className="max-w-5xl mx-auto px-6">
          <h3 className="text-2xl font-bold text-gray-800 mb-4">Philosophy</h3>
          <ul className="list-disc list-inside text-gray-700 space-y-2">
            <li>Handmade with love—always.</li>
            <li>Quality ingredients you can pronounce.</li>
            <li>Small batches for big flavors.</li>
            <li>Community first: we bake for smiles.</li>
          </ul>
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h3 className="text-2xl font-extrabold text-blue-200 mb-6">Little Steps</h3>

          {/* Horizontal scroll carousel with the same card design */}
          <div className="relative">
            <div ref={trackRef} className="flex gap-5 md:gap-6 overflow-x-auto no-scrollbar py-1 px-1 snap-x snap-mandatory" style={{scrollSnapType:'x mandatory'}}>
              {sample.map(item => (
                <figure key={item.id} className="group min-w-[240px] md:min-w-[280px] max-w-xs snap-start bg-white rounded-3xl overflow-hidden border-8 border-rose-200 ring-1 ring-rose-300/40 shadow-md transition-all duration-300 hover:shadow-xl hover:border-rose-300">
                  <div className="relative">
                    <img src={item.image} alt={item.title} className="w-full h-48 md:h-56 lg:h-64 object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                    {/* Caption overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  </div>
                  <figcaption className="px-4 py-3">
                    <div className="text-base font-semibold text-gray-800 group-hover:text-rose-500 transition-colors">{item.title}</div>
                    <div className="text-sm text-gray-500">{item.subtitle}</div>
                    <p className="mt-1 text-sm text-gray-600">{item.caption}</p>
                  </figcaption>
                </figure>
              ))}
            </div>

            {/* FIX: Adjusted the size and position of the scroll buttons */}
            <button aria-label="Scroll left" onClick={() => scrollBy(-280)}
              className="group hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/50 backdrop-blur-sm hover:bg-white/70 transition-colors"
            >
              <FaChevronLeft className="w-4 h-4 text-gray-600" aria-hidden="true" />
              <span className="sr-only">Scroll left</span>
            </button>
            <button aria-label="Scroll right" onClick={() => scrollBy(280)}
              className="group hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-10 p-2 rounded-full bg-white/50 backdrop-blur-sm hover:bg-white/70 transition-colors"
            >
              <FaChevronRight className="w-4 h-4 text-gray-600" aria-hidden="true" />
              <span className="sr-only">Scroll right</span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
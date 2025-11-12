import { useEffect } from 'react';
import { motion } from 'framer-motion';

import mixing from '../assets/mixing.jpg';
import mixing2 from '../assets/mixing2.jpg';
import shaping from '../assets/Shaping.jpg';
import filling from '../assets/filling.jpg';
import baking from '../assets/Baking.jpg';
import packaging from '../assets/packaging_new2.jpeg';

interface Step { id: string; image: string; title: string; caption: string; details: string; }

const process: Step[] = [
  { id: 'mix', image: mixing, title: 'Mixing', caption: 'Butter, sugar, and stories.', details: 'We cream real butter and sugar until it is light and fluffy, then fold in the best ingredients.' },
  { id: 'prep', image: mixing2, title: 'Preparing the Dough', caption: 'Flour in, magic out.', details: 'Dry ingredients meet wet; we rest the dough for better hydration and flavor development.' },
  { id: 'shape', image: shaping, title: 'Shaping', caption: 'Each cookie, hand-rolled.', details: 'We portion each cookie by hand for even bakes and that signature crackle.' },
  { id: 'fill', image: filling, title: 'Filling', caption: 'Surprises inside.', details: 'Chunks of chocolate, nuts, or our seasonal centers are tucked in with care.' },
  { id: 'bake', image: baking, title: 'Baking', caption: 'Timing to the second.', details: 'Every tray is watched closely—golden edges, gooey centers, consistent every time.' },
  { id: 'pack', image: packaging, title: 'Packaging', caption: 'Wrapped in warmth.', details: 'We pack fresh, label by hand, and seal with a smile ready for your doorstep.' },
];

export default function BehindTheScenes() {

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, []);

  return (
    <div className="font-inter antialiased">
      <section className="bg-gradient-to-b from-teal-50 to-white py-16">
        <div className="max-w-5xl mx-auto px-6">
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-800 mb-4">Behind the Scenes</h1>
          <p className="text-gray-600 text-lg max-w-3xl">A peek into our kitchen—clean counters, neatly labeled jars, and a playlist that makes the dough dance. Here’s how your cookie comes to life.</p>
        </div>
      </section>

      <section className="py-10">
        <div className="max-w-6xl mx-auto px-6 grid sm:grid-cols-2 md:grid-cols-3 gap-6">
          {process.map((p) => (
            <motion.figure
              key={p.id}
              className="rounded-2xl overflow-hidden shadow-md bg-white border group cursor-pointer"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              whileHover={{ scale: 1.01 }}
              transition={{ type: 'spring', stiffness: 220, damping: 22 }}
            >
              <motion.img src={p.image} alt={p.title}
                className="w-full h-56 object-cover"
                whileHover={{ scale: 1.03 }}
                transition={{ duration: 0.25, ease: 'easeOut' }}
              />
              <figcaption className="p-4">
                <div className="font-semibold text-gray-800 flex items-center justify-between">
                  <span>{p.title}</span>
                  <span className="text-xs text-teal-700">Click for details</span>
                </div>
                <div className="text-gray-600 text-sm">{p.caption}</div>
              </figcaption>
              <details className="px-4 pb-4">
                <summary className="text-sm text-gray-700 cursor-pointer hover:text-teal-700 transition-colors">Read more</summary>
                <p className="text-sm text-gray-600 mt-2">{p.details}</p>
              </details>
            </motion.figure>
          ))}
        </div>
      </section>

      <section className="py-16">
        <div className="max-w-5xl mx-auto px-6 prose max-w-none">
          <h3 className="text-2xl font-bold text-blue-300 mb-4">Our Kitchen, Our Rhythm ...</h3>
          <p>Beyond the steps above, there is a rhythm to our bakes: quiet early mornings, doughs resting while the kettle sings, trays rotating in perfect cadence. We taste, we tweak, and we log every batch so the next one is even better.</p>
          <p>We choose ingredients we can pronounce, and we source locally whenever possible. Our butter is always fresh, our chocolates are single-origin, and our nuts are roasted just before mixing.</p>
          <h4 className="text-xl font-semibold text-blue-300 mt-8 mb-2">The Details That Matter</h4>
          <ul className="list-disc list-inside text-white-400">
            <li>Resting dough for flavor development and better structure</li>
            <li>Precise portioning for a balanced bite</li>
            <li>Temperature control for consistent bakes</li>
            <li>Fresh packaging to lock in aromas</li>
          </ul>
          <p className="mt-6">Thank you for peeking behind the scenes. Each box you open carries our care and the joy we feel when the tray comes out of the oven.</p>
        </div>
      </section>
    </div>
  );
}


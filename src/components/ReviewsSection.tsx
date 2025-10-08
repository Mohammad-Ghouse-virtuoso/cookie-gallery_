
import { motion } from 'framer-motion';

export type ReviewItem = { id: number; name: string; rating: number; text: string; avatar: string };
import avatar1 from '../assets/Shayan_image.png';
import avatar2 from '../assets/rahul_pfp.jpg';
import avatar3 from '../assets/x_pfp.jpg';
import avatar4 from '../assets/Bharathi_pfp.jpg';

const defaultReviews: ReviewItem[] = [
  { id: 1, name: 'Shayan', rating: 5, text: 'Absolutely delicious! The choco-chip melts in your mouth. Will order again!', avatar: avatar1 },
  { id: 2, name: 'Rahul', rating: 4, text: 'Crunchy outside, gooey inside. Perfect with evening tea!', avatar: avatar2 },
  { id: 3, name: 'Sana', rating: 5, text: 'Best cookies in town. Loved the packaging too!', avatar: avatar3 },
  { id: 4, name: 'Aradhya', rating: 4, text: 'Tried the almond crunch—so good! Will recommend to friends.', avatar: avatar4 },
];

const Star = ({ filled }: { filled: boolean }) => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill={filled ? '#F59E0B' : 'none'} stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15 10 23 10 17 14 19 22 12 18 5 22 7 14 1 10 9 10 12 2"></polygon>
  </svg>
);

export default function ReviewsSection({ items }: { items?: ReviewItem[] }) {
  const reviews = items && items.length ? items : defaultReviews;
  return (
    <section className="py-16 bg-gradient-to-br from-amber-50/70 to-orange-50/70">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-4xl font-extrabold text-center text-gray-800 mb-12">What Our Customers Say</h2>
        <div className="overflow-hidden">
          <motion.div className="flex gap-6" animate={{ x: ['0%', '-50%'] }} transition={{ repeat: Infinity, repeatType: 'mirror', duration: 18, ease: 'easeInOut' }}>
            {[...reviews, ...reviews].map((r, idx) => (
              <motion.div key={`${r.id}-${idx}`} whileHover={{ scale: 1.03 }} className="min-w-[280px] max-w-[280px] bg-white/90 backdrop-blur rounded-2xl shadow-lg p-5 border border-amber-100">
                <div className="flex items-center gap-3 mb-3">
                  <img src={r.avatar} alt={r.name} className="w-10 h-10 rounded-full object-cover" />
                  <div>
                    <div className="font-semibold text-gray-800">{r.name}</div>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => <Star key={i} filled={i < r.rating} />)}
                    </div>
                  </div>
                </div>
                <p className="text-gray-600 leading-relaxed">{r.text}</p>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
  );
}


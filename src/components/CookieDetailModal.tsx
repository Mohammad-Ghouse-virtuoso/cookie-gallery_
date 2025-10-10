import { motion, AnimatePresence } from 'framer-motion';
import type { CookieData } from '../data/cookies';

type Props = { cookie: CookieData | null; onClose: () => void };

export default function CookieDetailsModal({ cookie, onClose }: Props) {
  if (!cookie) return null;

  const n = cookie.nutrition || {} as CookieData['nutrition'];
  const val = (v: number | null | undefined, suffix = '') =>
    v === null || v === undefined ? '—' : `${v}${suffix}`;

  return (
    <AnimatePresence>
      <motion.div
        key={cookie.id}
        className="fixed z-30 top-0 left-0 w-full h-full bg-black/60 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="bg-white rounded-xl shadow-2xl p-6 w-[22rem]"
          initial={{ scale: 0.9, y: 50 }}
          animate={{ scale: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0 }}
          onClick={e => e.stopPropagation()}
        >
          <img src={cookie.src} alt={cookie.name} loading="lazy" width="96" height="96" className="w-24 h-24 mx-auto object-contain" />
          <h2 className="text-xl font-bold mt-3 text-indigo-800 text-center">{cookie.name}</h2>
          <p className="text-sm text-gray-600 mt-2 mb-3 text-center">{cookie.description}</p>

          {cookie.dietPreference && (
            <div className="flex justify-center mb-3">
              <span className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 text-xs font-medium">
                {cookie.dietPreference}
              </span>
            </div>
          )}

          <div className="text-center mb-4">
            <span className="text-base font-semibold text-gray-900">₹{cookie.price}</span>
          </div>

          <div className="mt-2 border-t border-gray-100 pt-3">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Nutrition (per 100g)</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-gray-600">Energy</dt>
                <dd className="font-medium text-gray-900">{val(n.energy, ' kcal')}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-600">Protein</dt>
                <dd className="font-medium text-gray-900">{val(n.protein, ' g')}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-600">Total Fat</dt>
                <dd className="font-medium text-gray-900">{val(n.totalFat, ' g')}</dd>
              </div>
              <div className="flex items-center justify-between">
                <dt className="text-gray-600">Total Carbs</dt>
                <dd className="font-medium text-gray-900">{val(n.totalCarbs, ' g')}</dd>
              </div>
              <div className="flex items-center justify-between col-span-2">
                <dt className="text-gray-600">Total Sugar</dt>
                <dd className="font-medium text-gray-900">{val(n.totalSugar, ' g')}</dd>
              </div>
            </dl>
          </div>

          {cookie.allergens && cookie.allergens.length > 0 && (
            <div className="mt-3">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Allergens</h4>
              <div className="flex flex-wrap gap-1.5">
                {cookie.allergens.map((a, idx) => (
                  <span key={idx} className="px-2 py-0.5 rounded-full text-xs bg-rose-50 text-rose-700 border border-rose-200">{a}</span>
                ))}
              </div>
            </div>
          )}

          <button
            className="mt-5 w-full bg-indigo-600 text-white font-semibold py-2.5 rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            onClick={onClose}
          >Close</button>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

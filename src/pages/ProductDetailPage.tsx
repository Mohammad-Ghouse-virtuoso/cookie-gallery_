import { useEffect, useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cookies, type CookieData } from '@/data/cookies';
import { formatPrice } from '@/utils/formatPrice';
import { useCart } from '@/context/CartContext';
import { AlertTriangle, Info, Leaf, ShieldCheck, Truck } from 'lucide-react';
import type { CartStateWithMeta } from '@/types/cart';

const highlightPills = [
  'Premium Australian oats',
  'Rich in dietary fibre',
  'Zero maida, guilt-free snacking'
];

const storageInstructions = 'Store in a cool, dry place away from sunlight. Once opened, transfer to an airtight container to maintain freshness.';

const sellerInfo = {
  seller: 'Cookie Gallery Foods Pvt. Ltd.',
  address: '42, Bakers Street, Indiranagar, Bengaluru, India',
  license: 'FSSAI Lic. No. 112233445566',
  supportEmail: 'support@cookiegallery.in',
  manufacturer: 'Crafted in the House of Cookie Gallery ovens'
};

const ingredientsMap: Record<string, string[]> = {
  'choco-cookie': ['Whole wheat flour', 'Dark chocolate chips', 'Brown sugar', 'Butter', 'Cocoa powder', 'Sea salt'],
  'oatmeal-cookie': ['Rolled oats', 'Whole wheat flour', 'Brown sugar', 'Cinnamon', 'Golden raisins', 'Butter'],
  'peanut-cookie': ['Roasted peanuts', 'Peanut butter', 'Whole wheat flour', 'Cane sugar', 'Butter', 'Sea salt'],
  'cranberry-cookie': ['Cranberries', 'Gluten-free flour blend', 'Brown sugar', 'Butter', 'Orange zest'],
  'almond-cookie': ['Almond flour', 'Slivered almonds', 'Cane sugar', 'Butter', 'Vanilla extract'],
  'dark-choco-sea-salt': ['Dark chocolate chunks', 'Cocoa nibs', 'Whole wheat flour', 'Demerara sugar', 'Sea salt flakes'],
  'hazelnut-choco-praline': ['Hazelnuts', 'Praline paste', 'Cocoa powder', 'Whole wheat flour', 'Brown sugar'],
  'keto-almond-butter': ['Almond butter', 'Almond flour', 'Erythritol', 'Coconut oil', 'Egg whites']
};

const defaultIngredients = ['Whole grain flour', 'Plant-based butter', 'Raw cane sugar', 'Natural flavour extracts', 'Sea salt'];

const occasionMap: Record<string, string> = {
  'seasonal': 'Festive Celebrations',
  'premium': 'Gifting & Indulgence',
  'best-seller': 'Everyday Moments',
  'gluten-free': 'Healthy Snacking',
  'contains-nuts': 'Celebration Treats'
};

const itemFormMap: Record<string, string> = {
  'bar': 'Bar',
  'cookie': 'Cookie'
};

function resolveOccasion(cookie: CookieData): string {
  if (!cookie.tags?.length) return 'All Occasions';
  for (const tag of cookie.tags) {
    if (occasionMap[tag]) return occasionMap[tag];
  }
  return 'All Occasions';
}

function resolveItemForm(cookie: CookieData): string {
  if (cookie.tags?.includes('bar')) return itemFormMap.bar;
  return itemFormMap.cookie;
}

const nutritionLabelMap: Record<keyof CookieData['nutrition'], string> = {
  energy: 'Energy',
  protein: 'Protein',
  totalFat: 'Total Fat',
  fibre: 'Dietary Fibre',
  totalCarbs: 'Total Carbs',
  totalSugar: 'Total Sugar'
};

function useEscapeToCatalogue(onExit: () => void) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onExit();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onExit]);
}

export default function ProductDetailPage() {
  const { cookieId } = useParams<{ cookieId: string }>();
  const navigate = useNavigate();
  const { cart, setCart } = useCart();

  const cookie = useMemo(() => cookies.find(item => item.id === cookieId), [cookieId]);

  useEffect(() => {
    if (!cookie) {
      navigate('/cookies', { replace: true });
      return;
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [cookie, navigate]);

  useEscapeToCatalogue(() => navigate('/cookies'));

  if (!cookie) {
    return null;
  }

  const ingredients = ingredientsMap[cookie.id] ?? defaultIngredients;
  const dietBadge = cookie.dietPreference || 'Vegetarian';
  const allergens = cookie.allergens || ['Contains traces of nuts'];
  const occasion = resolveOccasion(cookie);
  const itemForm = resolveItemForm(cookie);
  const heroHighlights = highlightPills;
  const quantity = (cart as Record<string, number>)[cookie.id] ?? 0;
  const maxQuantity = 10;

  const updateQuantity = (nextQty: number) => {
    const safeQty = Math.max(0, Math.min(maxQuantity, nextQty));
    setCart(prev => {
      const next = { ...(prev as CartStateWithMeta) } as CartStateWithMeta;
      next._meta = next._meta ? { ...next._meta } : undefined;
      if (safeQty > 0) {
        next[cookie.id] = safeQty;
        const meta = (next._meta ??= {});
        meta[cookie.id] = {
          type: 'cookie',
          name: cookie.name,
          image: cookie.src,
          price: cookie.price,
          productId: cookie.id,
        };
      } else {
        delete next[cookie.id];
        if (next._meta) {
          delete next._meta[cookie.id];
        }
      }
      return next as unknown as typeof prev;
    });
  };

  const handleIncrement = () => updateQuantity(quantity + 1);
  const handleDecrement = () => updateQuantity(quantity - 1);
  const handleAddToCart = () => updateQuantity(quantity + 1);

  return (
    <div className="min-h-screen bg-[#FFF9F4] pb-24 text-[#3B2B1A]">
      <nav className="mx-auto flex w-full max-w-6xl items-center gap-2 px-4 pb-6 pt-8 text-sm text-[#8B7A68]">
        <Link to="/" className="transition-colors hover:text-[#3B2B1A]">Home</Link>
        <span aria-hidden="true">›</span>
        <Link to="/cookies" className="transition-colors hover:text-[#3B2B1A]">Cookies</Link>
        <span aria-hidden="true">›</span>
        <span className="text-[#3B2B1A] font-semibold">{cookie.name}</span>
      </nav>

      <header className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-6 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}
          className="relative overflow-hidden rounded-[24px] bg-[#FFF5EA] shadow-[0_30px_70px_rgba(226,185,127,0.22)]"
        >
          <img
            src={cookie.src}
            alt={cookie.name}
            loading="lazy"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1F13081A] to-transparent" aria-hidden="true" />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 32 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.35, delay: 0.08, ease: [0.19, 1, 0.22, 1] }}
          className="flex flex-col gap-6 rounded-[24px] bg-white/80 p-8 shadow-[0_24px_60px_rgba(139,122,104,0.12)] backdrop-blur-sm"
        >
          <div className="space-y-3">
            <h1 className="font-['Playfair_Display'] text-3xl font-semibold tracking-tight text-[#2A1C12] md:text-[34px]">
              {cookie.name}
            </h1>
            <p className="text-sm uppercase tracking-[0.24em] text-[#B79C84]">{cookie.tagline || 'Crafted for mindful indulgence'}</p>
            <p className="text-[15px] leading-relaxed text-[#6C6C6C]">{cookie.description}</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-[#F6E6D0] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#8B6A47]">
              <Truck className="h-4 w-4" aria-hidden="true" /> Fast Delivery
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#F2F2F2] px-4 py-2 text-xs font-medium uppercase tracking-wide text-[#7D7D7D]">
              <ShieldCheck className="h-4 w-4" aria-hidden="true" /> No Return / Exchange
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[#E8F5E4] px-4 py-2 text-xs font-semibold uppercase tracking-wide text-[#4A7D44]">
              <Leaf className="h-4 w-4" aria-hidden="true" /> {dietBadge}
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-2xl font-semibold text-[#2A1C12]">{formatPrice(cookie.price)}</div>
            {quantity === 0 ? (
              <button
                type="button"
                onClick={handleAddToCart}
                className="inline-flex items-center justify-center rounded-full bg-[#E2B97F] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(226,185,127,0.35)] transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#D7A86A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#B98042]"
              >
                Add to Cart
              </button>
            ) : (
              <div
                className="inline-flex items-center gap-3 rounded-full bg-[#F6ECDC] px-4 py-2"
                role="group"
                aria-label="Adjust quantity"
              >
                <button
                  type="button"
                  onClick={handleDecrement}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-semibold text-[#3A2E27] shadow-[0_8px_18px_rgba(139,122,104,0.12)] transition-all duration-150 ease-out hover:-translate-y-[1px] hover:bg-[#F0E1D2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7A86A]"
                  aria-label={`Decrease quantity of ${cookie.name}`}
                >
                  −
                </button>
                <span className="min-w-[2rem] text-center text-sm font-semibold text-[#3A2E27]" aria-live="polite">
                  {quantity}
                </span>
                <button
                  type="button"
                  onClick={handleIncrement}
                  disabled={quantity >= maxQuantity}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-semibold text-[#3A2E27] shadow-[0_8px_18px_rgba(139,122,104,0.12)] transition-all duration-150 ease-out hover:-translate-y-[1px] hover:bg-[#F0E1D2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7A86A] disabled:cursor-not-allowed disabled:opacity-60"
                  aria-label={`Increase quantity of ${cookie.name}`}
                >
                  +
                </button>
              </div>
            )}
          </div>

          <p className="text-xs text-[#8B7A68]">No return or exchange on consumable goods. Dispatches within 24 hours.</p>
        </motion.div>
      </header>

      <section className="mx-auto w-full max-w-6xl px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}
          className="grid gap-4 md:grid-cols-3"
        >
          {heroHighlights.map(text => (
            <div
              key={text}
              className="rounded-2xl bg-[#F9EBDD] px-6 py-5 text-sm font-medium text-[#5A3F28] shadow-[0_12px_24px_rgba(193,140,93,0.12)] transition-transform duration-200 ease-out hover:-translate-y-1"
            >
              {text}
            </div>
          ))}
        </motion.div>
      </section>

      <section className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <motion.article
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4, ease: [0.19, 1, 0.22, 1] }}
          className="rounded-[24px] border border-[#F0E6DA] bg-white/90 p-8 shadow-[0_20px_50px_rgba(226,185,127,0.16)]"
        >
          <header className="mb-6 flex items-center gap-3 border-b border-[#F0E6DA] pb-4">
            <ShieldCheck className="h-5 w-5 text-[#D29B5E]" aria-hidden="true" />
            <h2 className="font-['Playfair_Display'] text-xl font-semibold tracking-tight text-[#2F1F15]">Product Specifications</h2>
          </header>
          <dl className="grid gap-y-3 text-sm text-[#554539]">
            <div className="flex justify-between gap-4 border-b border-[#F5EDE1] pb-3">
              <dt className="font-medium">Brand</dt>
              <dd>House of Cookie Gallery</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#F5EDE1] pb-3">
              <dt className="font-medium">Product Type</dt>
              <dd>Digestive Biscuits</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#F5EDE1] pb-3">
              <dt className="font-medium">Flavour</dt>
              <dd>{cookie.name}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#F5EDE1] pb-3">
              <dt className="font-medium">Pack of</dt>
              <dd>2</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#F5EDE1] pb-3">
              <dt className="font-medium">Weight</dt>
              <dd>120 g</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#F5EDE1] pb-3">
              <dt className="font-medium">Shelf Life</dt>
              <dd>6 months</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#F5EDE1] pb-3">
              <dt className="font-medium">Dietary Preference</dt>
              <dd>{dietBadge}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#F5EDE1] pb-3">
              <dt className="font-medium">Occasion</dt>
              <dd>{occasion}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#F5EDE1] pb-3">
              <dt className="font-medium">Item Form</dt>
              <dd>{itemForm}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#F5EDE1] pb-3">
              <dt className="font-medium">Material Type Free</dt>
              <dd>Maida-free, Trans Fat-free</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-[#F5EDE1] pb-3">
              <dt className="font-medium">Packaging Type</dt>
              <dd>Pouch</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="font-medium">Country of Origin</dt>
              <dd>India</dd>
            </div>
          </dl>
        </motion.article>

        <motion.article
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.4, delay: 0.05, ease: [0.19, 1, 0.22, 1] }}
          className="rounded-[24px] border border-[#F0E6DA] bg-white/90 p-8 shadow-[0_20px_50px_rgba(226,185,127,0.16)]"
        >
          <header className="mb-6 flex items-center gap-3 border-b border-[#F0E6DA] pb-4">
            <Info className="h-5 w-5 text-[#D29B5E]" aria-hidden="true" />
            <h2 className="font-['Playfair_Display'] text-xl font-semibold tracking-tight text-[#2F1F15]">Ingredients & Nutrition</h2>
          </header>

          <div className="mb-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8B7A68]">Ingredients</h3>
            <ul className="mt-3 grid gap-2 text-sm text-[#4F4136] md:grid-cols-2">
              {ingredients.map(item => (
                <li key={item} className="rounded-full bg-[#F7EDE1] px-4 py-1.5">{item}</li>
              ))}
            </ul>
          </div>

          <div className="mb-6">
            <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8B7A68]">Nutrition (per 100g)</h3>
            <dl className="mt-3 grid gap-3 sm:grid-cols-2">
              {Object.entries(cookie.nutrition).map(([key, value]) => (
                <div key={key} className="rounded-2xl bg-[#FBF4EB] px-4 py-3 text-sm text-[#4C3A2F] shadow-[0_10px_20px_rgba(139,122,104,0.1)]">
                  <dt className="text-xs uppercase tracking-[0.2em] text-[#987A61]">{nutritionLabelMap[key as keyof CookieData['nutrition']]}</dt>
                  <dd className="mt-1 text-base font-semibold text-[#2A1C12]">{value != null ? `${value} ${key === 'energy' ? 'kcal' : 'g'}` : '—'}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div>
            <h3 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.18em] text-[#8B7A68]">
              <AlertTriangle className="h-4 w-4 text-[#C06F55]" aria-hidden="true" /> Allergen Information
            </h3>
            <div className="mt-3 flex flex-wrap gap-2">
              {allergens.map(item => (
                <span key={item} className="rounded-full border border-[#F4D5C1] bg-[#FFF5EE] px-3 py-1 text-xs font-medium uppercase text-[#A05C3B]">
                  {item}
                </span>
              ))}
            </div>
          </div>
        </motion.article>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}
          className="rounded-[24px] bg-[#FBF2E6] p-8 text-sm text-[#514235] shadow-[0_18px_44px_rgba(193,140,93,0.16)]"
        >
          <h2 className="font-['Playfair_Display'] text-lg font-semibold text-[#2F1F15]">Storage Instructions</h2>
          <p className="mt-3 leading-relaxed">{storageInstructions}</p>
        </motion.div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.35, ease: [0.19, 1, 0.22, 1] }}
          className="rounded-[24px] bg-[#F3F1EF] p-8 text-xs text-[#6F6257] shadow-[0_16px_36px_rgba(139,122,104,0.18)]"
        >
          <div className="flex flex-col gap-3 md:flex-row md:justify-between">
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8B7A68]">Seller</h3>
              <p className="mt-1 font-medium text-[#3B2B1A]">{sellerInfo.seller}</p>
              <p>{sellerInfo.address}</p>
              <p>License: {sellerInfo.license}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8B7A68]">Customer Support</h3>
              <p>Email: {sellerInfo.supportEmail}</p>
            </div>
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8B7A68]">Manufacturer</h3>
              <p>{sellerInfo.manufacturer}</p>
            </div>
          </div>
          <p className="mt-6 text-[11px] leading-relaxed text-[#9A9187]">
            Disclaimer: Product images are for representational purposes only. Ingredient lists may vary slightly between batches; always refer to the packaging for the most accurate information.
          </p>
        </motion.div>
      </section>

      <footer className="mt-10 bg-[#E2B97F] py-8 text-white">
        <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-6 px-4 md:flex-row md:items-center">
          <div>
            <p className="font-['Playfair_Display'] text-lg italic">“Taste health, one bite at a time.”</p>
            <p className="mt-1 text-sm text-white/80">Crafted by Cookie Gallery</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/cookies')}
              className="inline-flex items-center justify-center rounded-full border border-white/70 px-5 py-2 text-sm font-semibold text-white transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:bg-white hover:text-[#B98042]"
            >
              Back to Catalogue
            </button>
            <div className="rounded-full bg-white/10 px-3 py-2 text-sm font-semibold tracking-wide">Cookie Gallery</div>
          </div>
        </div>
      </footer>

      <div className="fixed bottom-0 left-0 right-0 z-[998] bg-white/95 p-4 backdrop-blur md:hidden">
        <div className="flex items-center justify-between gap-4">
          <span className="text-lg font-semibold text-[#2A1C12]">{formatPrice(cookie.price)}</span>
          {quantity === 0 ? (
            <button
              type="button"
              onClick={handleAddToCart}
              className="inline-flex flex-1 items-center justify-center rounded-full bg-[#E2B97F] px-6 py-3 text-sm font-semibold text-white shadow-[0_12px_24px_rgba(226,185,127,0.35)] transition-transform duration-200 ease-out hover:-translate-y-0.5 hover:bg-[#D7A86A]"
            >
              Add to Cart
            </button>
          ) : (
            <div
              className="flex flex-1 items-center justify-end gap-3 rounded-full bg-[#F6ECDC] px-4 py-2"
              role="group"
              aria-label="Adjust quantity"
            >
              <button
                type="button"
                onClick={handleDecrement}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-semibold text-[#3A2E27] shadow-[0_8px_18px_rgba(139,122,104,0.12)] transition-all duration-150 ease-out hover:-translate-y-[1px] hover:bg-[#F0E1D2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7A86A]"
                aria-label={`Decrease quantity of ${cookie.name}`}
              >
                −
              </button>
              <span className="min-w-[2rem] text-center text-sm font-semibold text-[#3A2E27]" aria-live="polite">
                {quantity}
              </span>
              <button
                type="button"
                onClick={handleIncrement}
                disabled={quantity >= maxQuantity}
                className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-semibold text-[#3A2E27] shadow-[0_8px_18px_rgba(139,122,104,0.12)] transition-all duration-150 ease-out hover:-translate-y-[1px] hover:bg-[#F0E1D2] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D7A86A] disabled:cursor-not-allowed disabled:opacity-60"
                aria-label={`Increase quantity of ${cookie.name}`}
              >
                +
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

import { useEffect, useMemo, useState } from 'react';
import { cookies as allCookies, type CookieData } from '../data/cookies';
import CookieCard from '../components/CookieCard';
import { useCart } from '../context/CartContext';
import CookieDetailsModal from '../components/CookieDetailModal';
import { Button } from '@/components/ui/button';
import SkeletonCard from '@/components/SkeletonCard';

export default function CookieCatalogue() {
  const { cart, setCart } = useCart();
  const [q, setQ] = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [selectedCookie, setSelectedCookie] = useState<CookieData | null>(null);
  const [ready, setReady] = useState(false);

  // Ensure we start at the top when navigating to this page
  useEffect(() => {
    window.scrollTo(0, 0);
    // Simulate minimal delay to allow layout to stabilize before images load
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  const fixedFilters: Array<{ label: string; value: string; kind: 'tag' | 'diet' }>= [
    { label: 'Gluten-Free', value: 'gluten-free', kind: 'tag' },
    { label: 'Sugar-Free', value: 'sugar-free', kind: 'tag' },
    { label: 'Best-seller', value: 'best-seller', kind: 'tag' },
    { label: 'High-Protein', value: 'high-protein', kind: 'tag' },
    { label: 'Contains Nuts', value: 'contains-nuts', kind: 'tag' },
    { label: 'Vegetarian (Eggless)', value: 'vegetarian-eggless', kind: 'diet' },
  ];

  const filtered = useMemo(() => {
    return allCookies.filter(c => {
      const ql = q.trim().toLowerCase();
      const matchesText = !ql || c.name.toLowerCase().includes(ql) || c.description.toLowerCase().includes(ql);
      if (!activeTag) return matchesText;
      const filter = fixedFilters.find(f => f.value === activeTag);
      if (!filter) return matchesText;
      if (filter.kind === 'tag') {
        return matchesText && !!c.tags?.includes(filter.value);
      }
      // diet filters
      if (filter.value === 'vegetarian-eggless') {
        return matchesText && (c.dietPreference?.toLowerCase().includes('vegetarian') ?? false);
      }
      return matchesText;
    });
  }, [q, activeTag]);

  const setFilter = (t: string | null) => setActiveTag(t);

  const handleQuantityChange = (cookieId: string, newQuantity: number) => {
    setCart(currentCart => {
      const updatedCart = { ...currentCart } as Record<string, number>;
      if (newQuantity > 0) updatedCart[cookieId] = newQuantity; else delete updatedCart[cookieId];
      return updatedCart;
    });
  };

  return (
  <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <h1 className="text-3xl font-extrabold text-gray-800">Cookie Catalogue</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                value={q}
                onChange={e => setQ(e.target.value)}
                placeholder="Search cookies..."
                className="w-80 sm:w-96 max-w-full pl-10 pr-12 py-2.5 rounded-xl focus:ring-2 focus:ring-indigo-300 focus:outline-none bg-transparent border border-indigo-200/40 shadow-sm placeholder:text-gray-500"
              />
              <svg className="absolute left-3 top-2.5 h-5 w-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="2" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M18 10.5a7.5 7.5 0 11-15 0 7.5 7.5 0 0115 0z" />
              </svg>
              {q && (
                <button
                  aria-label="Clear search"
                  type="button"
                  onClick={() => setQ('')}
                  className="absolute right-2 top-2 z-10 h-6 w-6 rounded-full text-gray-500 hover:text-gray-700 bg-transparent flex items-center justify-center"
                >
                  <span className="sr-only">Clear</span>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 8.586l4.95-4.95 1.414 1.414L11.414 10l4.95 4.95-1.414 1.414L10 11.414l-4.95 4.95-1.414-1.414L8.586 10l-4.95-4.95L5.05 3.636 10 8.586z" clipRule="evenodd"/></svg>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {fixedFilters.map(f => {
            const isActive = activeTag === f.value;
            return (
              <Button
                key={f.value}
                onClick={() => setFilter(isActive ? null : f.value)}
                variant={isActive ? 'outline' : 'ghost'}
                size="sm"
                className={`${
                  isActive
                    ? 'bg-indigo-100 border-indigo-200 text-indigo-800'
                    : 'bg-white border border-gray-200 text-gray-800 hover:bg-gray-50'
                } rounded-full text-[11px] px-2.5 py-1 h-8`}
              >
                <span className="inline-flex items-center gap-1">
                  {isActive && <span aria-hidden>❌</span>}
                  <span>{f.label}</span>
                </span>
              </Button>
            );
          })}
          {activeTag && (
            <Button onClick={() => setFilter(null)} variant="ghost" size="sm" className="rounded-full bg-white/70 border border-gray-200 text-gray-700 hover:bg-white text-[11px] px-2.5 py-1">
              Clear Filters
            </Button>
          )}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 sm:gap-8">
          {!ready && (
            <>
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </>
          )}

          {ready && filtered.length === 0 && (
            <div className="col-span-full text-center text-gray-500">
              No results found.
            </div>
          )}
          {ready && filtered.map(cookie => (
            <CookieCard
              key={cookie.id}
              cookie={cookie as CookieData}
              quantity={(cart as any)[cookie.id] || 0}
              onChange={(newQty) => handleQuantityChange(cookie.id, newQty)}
              onShowDetails={() => setSelectedCookie(cookie as CookieData)}
            />
          ))}
        </div>

        <CookieDetailsModal
          cookie={selectedCookie}
          onClose={() => setSelectedCookie(null)}
        />
      </div>
    </main>
  );
}

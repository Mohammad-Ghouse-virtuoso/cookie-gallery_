import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { cookies as allCookies, type CookieData } from '../data/cookies';
import CookieCard from '../components/CookieCard';
import { useCart } from '../context/CartContext';
import CookieDetailsModal from '../components/CookieDetailModal';
import { Button } from '@/components/ui/button';
import { CookieCardSkeleton } from '@/components/ui/skeleton';
import { Search, X } from 'lucide-react';

export default function CookieCatalogue() {
  const { cart, setCart } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDietaryFilters, setActiveDietaryFilters] = useState<string[]>([]);
  const [activeProductTypes, setActiveProductTypes] = useState<string[]>([]);
  const [selectedCookie, setSelectedCookie] = useState<CookieData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFilterTransitioning, setIsFilterTransitioning] = useState(false);

  // Smooth scroll to top on mount
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    const timer = setTimeout(() => setIsLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Scroll to highlighted cookie if navigation passed state or query
  const location = useLocation();
  useEffect(() => {
    // read from state first
     
    const state = (location.state as any) || {};
    let highlightId = state.highlight as string | undefined;
    if (!highlightId) {
      const params = new URLSearchParams(location.search);
      highlightId = params.get('highlight') || undefined;
    }
    if (highlightId) {
      // delay slightly to allow grid to render
      const t = setTimeout(() => {
        const el = document.getElementById(highlightId!);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          el.classList.add('blink-highlight');
          setTimeout(() => el.classList.remove('blink-highlight'), 2000 + 200);
        }
      }, 300);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.key]);

  // Prevent scroll jump when filters change
  useEffect(() => {
    if (activeDietaryFilters.length > 0 || activeProductTypes.length > 0 || searchQuery) {
      setIsFilterTransitioning(true);
      const timer = setTimeout(() => setIsFilterTransitioning(false), 150);
      return () => clearTimeout(timer);
    }
  }, [activeDietaryFilters, activeProductTypes, searchQuery]);

  const dietaryFilters = [
    { label: 'Gluten-Free', value: 'gluten-free' },
    { label: 'Sugar-Free', value: 'sugar-free' },
    { label: 'High-Protein', value: 'high-protein' },
    { label: 'Contains Nuts', value: 'contains-nuts' },
    { label: 'Vegetarian (Eggless)', value: 'vegetarian-eggless' },
  ];

  const productTypeFilters = [
    { label: 'Best-Seller', value: 'best-seller' },
    { label: 'Premium', value: 'premium' },
    { label: 'Classic', value: 'classic' },
    { label: 'Seasonal', value: 'seasonal' },
  ];

  const toggleDietaryFilter = (value: string) => {
    setIsFilterTransitioning(true);
    setActiveDietaryFilters(prev =>
      prev.includes(value) ? prev.filter(f => f !== value) : [...prev, value]
    );
  };

  const toggleProductType = (value: string) => {
    setIsFilterTransitioning(true);
    setActiveProductTypes(prev =>
      prev.includes(value) ? prev.filter(f => f !== value) : [...prev, value]
    );
  };

  const clearAllFilters = () => {
    setActiveDietaryFilters([]);
    setActiveProductTypes([]);
    setSearchQuery('');
  };

  const filtered = useMemo(() => {
    return allCookies.filter(cookie => {
      const searchLower = searchQuery.trim().toLowerCase();
      const matchesSearch = !searchLower || 
        cookie.name.toLowerCase().includes(searchLower) || 
        cookie.description.toLowerCase().includes(searchLower);

      if (!matchesSearch) return false;

      const matchesDietary = activeDietaryFilters.length === 0 || activeDietaryFilters.some(filter => {
        if (cookie.tags?.includes(filter)) return true;
        if (filter === 'vegetarian-eggless' && cookie.dietPreference?.toLowerCase().includes('vegetarian')) return true;
        const dietPrefLower = cookie.dietPreference?.toLowerCase() || '';
        if (filter === 'gluten-free' && dietPrefLower.includes('gluten')) return true;
        if (filter === 'sugar-free' && dietPrefLower.includes('sugar')) return true;
        return false;
      });

      if (!matchesDietary) return false;

      const matchesProductType = activeProductTypes.length === 0 || activeProductTypes.some(type => cookie.tags?.includes(type));
      return matchesProductType;
    });
  }, [searchQuery, activeDietaryFilters, activeProductTypes]);

  const handleQuantityChange = (cookieId: string, newQuantity: number) => {
    setCart(currentCart => {
      const updatedCart = { ...currentCart } as Record<string, number>;
      if (newQuantity > 0) updatedCart[cookieId] = newQuantity; 
      else delete updatedCart[cookieId];
      return updatedCart;
    });
  };

  const activeFiltersCount = activeDietaryFilters.length + activeProductTypes.length;

  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 py-10" style={{ scrollBehavior: 'smooth' }}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 sticky top-0 z-10 bg-gradient-to-br from-gray-50 to-blue-50 py-4 -mt-4">
          <h1 className="text-4xl font-extrabold text-gray-800">Cookie Catalogue</h1>
          <div className="flex items-center gap-3">
            <div className="relative">
              <label htmlFor="cookie-search" className="sr-only">Search cookies</label>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 pointer-events-none" aria-hidden="true" />
              <input
                id="cookie-search"
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search cookies..."
                className="w-80 sm:w-96 max-w-full pl-10 pr-10 py-2.5 bg-white shadow-[inset_0_1px_3px_rgba(0,0,0,0.06)] focus:shadow-[inset_0_1px_4px_rgba(0,0,0,0.08)] placeholder:text-[#6b6b6b] text-gray-700 transition-all duration-200"
                style={{
                  borderRadius: 'var(--radius-md)',
                  border: 'none',
                  outline: 'none'
                }}
                aria-label="Search cookies by name or description"
              />
              {searchQuery && (
                <button
                  aria-label="Clear search"
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 flex items-center justify-center text-gray-400 hover:text-[#5b3a20] transition-colors duration-160"
                  style={{
                    border: 'none',
                    outline: 'none',
                    background: 'none'
                  }}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>
        </header>

        <div className="mb-8 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Dietary Preferences</h2>
              {activeFiltersCount > 0 && (
                <button 
                  onClick={clearAllFilters} 
                  className="text-xs text-[#5b3a20] hover:text-[#3a2310] font-medium hover:bg-[#f8eddc] transition-all duration-180"
                  style={{
                    borderRadius: 'var(--radius-pill)',
                    padding: '6px 12px',
                    border: 'none',
                    outline: 'none'
                  }}
                >
                  Clear all ({activeFiltersCount})
                </button>
              )}
            </div>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Dietary preference filters">
              {dietaryFilters.map(filter => {
                const isActive = activeDietaryFilters.includes(filter.value);
                return (
                  <Button
                    key={filter.value}
                    onClick={() => toggleDietaryFilter(filter.value)}
                    variant="ghost"
                    size="sm"
                    className={'rounded-full px-5 py-2 h-auto text-[15px] font-medium transition-all duration-180 ' + (isActive ? 'bg-[#F1B55C] text-white border border-[#F1B55C] hover:bg-[#dba661] hover:shadow-[0_2px_8px_rgba(241,181,92,0.25)] hover:-translate-y-0.5' : 'bg-white/85 text-[#2f2f36] border border-[#E8DCC9]/40 hover:bg-white hover:border-[#E8DCC9]/70 hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)] hover:-translate-y-0.5')}
                    style={{ paddingTop: '9px', paddingBottom: '9px' }}
                    aria-pressed={isActive}
                    aria-label={(isActive ? 'Remove' : 'Apply') + ' ' + filter.label + ' filter'}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {isActive && <span className="text-xs" aria-hidden="true">✓</span>}
                      <span>{filter.label}</span>
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>

          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Product Types</h2>
            <div className="flex flex-wrap gap-2" role="group" aria-label="Product type filters">
              {productTypeFilters.map(filter => {
                const isActive = activeProductTypes.includes(filter.value);
                return (
                  <Button
                    key={filter.value}
                    onClick={() => toggleProductType(filter.value)}
                    variant="ghost"
                    size="sm"
                    className={'rounded-full px-5 py-2 h-auto text-[15px] font-medium transition-all duration-180 ' + (isActive ? 'bg-[#F1B55C] text-white border border-[#F1B55C] hover:bg-[#dba661] hover:shadow-[0_2px_8px_rgba(241,181,92,0.25)] hover:-translate-y-0.5' : 'bg-white/85 text-[#2f2f36] border border-[#E8DCC9]/40 hover:bg-white hover:border-[#E8DCC9]/70 hover:shadow-[0_2px_6px_rgba(0,0,0,0.08)] hover:-translate-y-0.5')}
                    style={{ paddingTop: '9px', paddingBottom: '9px' }}
                    aria-pressed={isActive}
                    aria-label={(isActive ? 'Remove' : 'Apply') + ' ' + filter.label + ' filter'}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      {isActive && <span className="text-xs" aria-hidden="true">✓</span>}
                      <span>{filter.label}</span>
                    </span>
                  </Button>
                );
              })}
            </div>
          </div>
        </div>

        {(searchQuery || activeFiltersCount > 0) && (
          <div className="mb-6 flex items-center gap-2 text-sm text-gray-600">
            <span>Showing {filtered.length} of {allCookies.length} cookies</span>
            {activeFiltersCount > 0 && <span className="text-gray-400">• {activeFiltersCount} filter{activeFiltersCount !== 1 ? 's' : ''} active</span>}
          </div>
        )}

        <section aria-label="Cookie products grid">
          {isLoading ? (
            <div 
              className="grid gap-6 sm:gap-8"
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gridAutoRows: '1fr'
              }}
            >
              {Array.from({ length: 12 }).map((_, i) => <CookieCardSkeleton key={i} />)}
            </div>
          ) : (
            <div 
              className={`grid transition-opacity duration-200 ${isFilterTransitioning ? 'opacity-50' : 'opacity-100'}`}
              style={{
                gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
                gridAutoRows: '1fr',
                gap: 'var(--space-lg)',
                minHeight: '400px'
              }}
            >
              {filtered.length === 0 && (
                <div className="col-span-full text-center text-gray-500 py-12" role="status">
                  <div className="max-w-md mx-auto">
                    <p className="text-lg font-medium mb-2">No cookies found</p>
                    <p className="text-sm text-gray-400 mb-4">{searchQuery ? 'No results for "' + searchQuery + '"' : 'Try adjusting your filters'}</p>
                    {(searchQuery || activeFiltersCount > 0) && (
                      <Button onClick={clearAllFilters} variant="outline" size="sm" className="rounded-full">
                        Clear all filters
                      </Button>
                    )}
                  </div>
                </div>
              )}
              {filtered.map(cookie => (
                <CookieCard
                  key={cookie.id}
                  cookie={cookie as CookieData}
                  quantity={(cart as any)[cookie.id] || 0}
                  onChange={(newQty) => handleQuantityChange(cookie.id, newQty)}
                  onShowDetails={() => setSelectedCookie(cookie)}
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedCookie && <CookieDetailsModal cookie={selectedCookie} onClose={() => setSelectedCookie(null)} />}
    </main>
  );
}

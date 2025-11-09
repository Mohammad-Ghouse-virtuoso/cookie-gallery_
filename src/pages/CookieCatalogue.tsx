import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { cookies as allCookies, type CookieData } from '../data/cookies';
import CookieCard from '../components/CookieCard';
import { useCart } from '../context/CartContext';
import { Button } from '@/components/ui/button';
import { CookieCardSkeleton } from '@/components/ui/skeleton';

export default function CookieCatalogue() {
  const { cart, setCart } = useCart();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeDietaryFilters, setActiveDietaryFilters] = useState<string[]>([]);
  const [activeProductTypes, setActiveProductTypes] = useState<string[]>([]);
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);

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

  const filterButtonBaseClasses = 'rounded-full px-5 py-3 text-sm font-medium transition-all duration-150 ease-out transform border justify-center whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[#E2B97F] hover:-translate-y-0.5 active:scale-105';
  const filterButtonActiveClasses = '!bg-[#E2B97F] !text-white !border-transparent !shadow-[0_8px_20px_rgba(193,140,93,0.28)] hover:!bg-[#E3BA8A] hover:!shadow-[0_10px_24px_rgba(193,140,93,0.32)]';
  const filterButtonInactiveClasses = '!bg-white !text-[#3A2E27] !border-[#E3E3E3] !shadow-[0_2px_6px_rgba(58,46,39,0.08)] hover:!bg-[#F8EEDB] hover:!shadow-[0_6px_16px_rgba(226,185,127,0.16)]';
  const filterChipRowClasses = 'flex gap-[12px] overflow-x-auto pb-1 scroll-smooth justify-start md:flex-wrap md:justify-start md:overflow-visible';
  const clearFiltersButtonClasses = 'transform inline-flex items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold bg-[#F2D3A8] text-[#5B3A20] transition-all duration-200 ease-out hover:bg-[#E8C58F] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(226,185,127,0.24)] hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E2B97F] focus-visible:ring-offset-2 active:scale-[0.96] active:shadow-none';

  const toggleDietaryFilter = (value: string) => {
    setActiveDietaryFilters(prev =>
      prev.includes(value) ? prev.filter(f => f !== value) : [...prev, value]
    );
  };

  const toggleProductType = (value: string) => {
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
            <div className="relative group">
              <label htmlFor="cookie-search" className="sr-only">Search cookies</label>
              <span
                aria-hidden="true"
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[20px] leading-none"
              >
                🔍
              </span>
              <input
                id="cookie-search"
                type="search"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search cookies..."
                className="w-full sm:w-96 max-w-full pl-11 pr-4 py-3 bg-white text-[#3A2E27] border border-[#E0E0E0] placeholder:text-[#9B9B9B] transition-all duration-200 ease-out focus:border-[#F1B55C] focus:ring-2 focus:ring-[#F1B55C]/30 focus:outline-none shadow-sm transform group-hover:border-[#E2B97F] group-hover:shadow-[0_18px_38px_rgba(193,140,93,0.18)] group-hover:bg-[#FFFCF7] group-hover:-translate-y-0.5"
                style={{
                  borderRadius: 'var(--radius-md)'
                }}
                aria-label="Search cookies by name or description"
              />
            </div>
          </div>
        </header>

        <div className="mb-10 space-y-10">
          <div>
            <div className="flex flex-wrap items-center justify-between mb-4 gap-4">
              <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Dietary Preferences</h2>
              <div className="flex min-h-[40px] min-w-[112px] sm:min-w-[140px] items-center justify-end">
                <button 
                  onClick={clearAllFilters} 
                  className={`${clearFiltersButtonClasses} ${activeFiltersCount > 0 ? '' : 'pointer-events-none invisible'}`}
                  aria-hidden={activeFiltersCount > 0 ? undefined : true}
                  tabIndex={activeFiltersCount > 0 ? 0 : -1}
                  type="button"
                >
                  Clear filters{activeFiltersCount > 0 ? ` (${activeFiltersCount})` : ''}
                </button>
              </div>
            </div>
            <div
              className={filterChipRowClasses}
              role="group"
              aria-label="Dietary preference filters"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {dietaryFilters.map(filter => {
                const isActive = activeDietaryFilters.includes(filter.value);
                return (
                  <Button
                    key={filter.value}
                    onClick={() => toggleDietaryFilter(filter.value)}
                    variant="ghost"
                    size="sm"
                    className={`${filterButtonBaseClasses} ${isActive ? filterButtonActiveClasses : filterButtonInactiveClasses}`}
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
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Product Types</h2>
            <div
              className={filterChipRowClasses}
              role="group"
              aria-label="Product type filters"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {productTypeFilters.map(filter => {
                const isActive = activeProductTypes.includes(filter.value);
                return (
                  <Button
                    key={filter.value}
                    onClick={() => toggleProductType(filter.value)}
                    variant="ghost"
                    size="sm"
                    className={`${filterButtonBaseClasses} ${isActive ? filterButtonActiveClasses : filterButtonInactiveClasses}`}
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
              className="grid transition-opacity duration-200"
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
                  onShowDetails={() => navigate(`/product/${cookie.id}`)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

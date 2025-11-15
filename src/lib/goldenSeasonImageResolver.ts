type ImageModule = { default: string };

type ImageContext = 'hero' | 'product';

const heroImages = import.meta.glob<ImageModule>('../assets/golden-season/hero/*.{jpg,jpeg,png,webp}', { eager: true });
const productImages = import.meta.glob<ImageModule>('../assets/golden-season/boxes/*.{jpg,jpeg,png,webp}', { eager: true });

const FALLBACK_PRODUCT = productImages['../assets/golden-season/boxes/placeholder-wrapped.jpg']?.default ?? '';
const FALLBACK_HERO = (() => {
  const firstEntry = Object.values(heroImages)[0];
  if (!firstEntry) {
    return FALLBACK_PRODUCT;
  }
  return firstEntry.default;
})();

function findMatch(modules: Record<string, ImageModule>, giftId: string) {
  const normalized = giftId.replace(/[^a-z0-9-]/gi, '').toLowerCase();
  const entries = Object.entries(modules);
  const exact = entries.find(([path]) => path.includes(`/${normalized}.`));
  if (exact) {
    return exact[1].default;
  }
  const partial = entries.find(([path]) => path.includes(`/${normalized}-`));
  if (partial) {
    return partial[1].default;
  }
  return null;
}

export function resolveImage(giftId: string | null | undefined, context: ImageContext): string {
  if (!giftId) {
    return context === 'hero' ? FALLBACK_HERO : FALLBACK_PRODUCT;
  }
  const lookup = context === 'hero' ? heroImages : productImages;
  const match = findMatch(lookup, giftId);
  if (match) {
    return match;
  }
  return context === 'hero' ? FALLBACK_HERO : FALLBACK_PRODUCT;
}


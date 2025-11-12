import warmBoxHero from '../assets/Warm_box_cookies_3.png';
import midnightBoxHero from '../assets/Midnight_luxe_1.jpeg';
import starlightBoxHero from '../assets/Starlight_luxe_1.jpeg';

export type GoldenSeasonPlaceholderTone = 'warm' | 'midnight' | 'starlight';

export type GoldenSeasonBox = {
  key: string;
  title: string;
  tagline: string;
  price: number;
  imagePriority: string[];
  placeholderTone: GoldenSeasonPlaceholderTone;
  previewImage: string;
  previewAlt: string;
};

export const goldenSeasonBoxes: GoldenSeasonBox[] = [
  {
    key: 'warm-glow',
    title: 'Golden Hearth Collection',
    tagline: 'Ribbon-wrapped oatmeal, almond, and chocolate bakes for candlelit gatherings.',
    price: 1399,
    imagePriority: ['box-warm', 'box-cozy', 'box'],
    placeholderTone: 'warm',
    previewImage: warmBoxHero,
    previewAlt: 'Golden Hearth cookies with ribbons on a wooden table',
  },
  {
    key: 'midnight-luxe',
    title: 'Midnight Luxe Box',
    tagline: 'Dark chocolate jewels on black marble with golden sparks for after-hours toasts.',
    price: 1599,
    imagePriority: ['box-midnight', 'box-dark', 'box'],
    placeholderTone: 'midnight',
    previewImage: midnightBoxHero,
    previewAlt: 'Midnight Luxe dark chocolate cookies on black marble',
  },
  {
    key: 'starlight-box',
    title: 'Starlight Reverie Box',
    tagline: 'Rose and pistachio confections in a pastel glow made for dreamers.',
    price: 1699,
    imagePriority: ['box-starlight', 'box-rose', 'box'],
    placeholderTone: 'starlight',
    previewImage: starlightBoxHero,
    previewAlt: 'Starlight Reverie rose-pistachio cookies under soft lights',
  },
];

export function getGoldenSeasonBox(key: string | null | undefined): GoldenSeasonBox | undefined {
  if (!key) return undefined;
  return goldenSeasonBoxes.find(box => box.key === key);
}

import chocoChunk from '../assets/Choco-cookie.jpg';
import oatmealRaisin from '../assets/Oatmeal-cookie.jpg';
import whiteChoco from '../assets/white_choco-cookie.jpg';
import gingerCookie from '../assets/ginger-cookie.jpg';
import peanutCookie from '../assets/Peanut_butter-cookie.jpg';
import doubleChoco from '../assets/double-choco-cookie.jpg';
import cranberryCookie from '../assets/cranberry-cookie.jpg';
import coconutCookie from '../assets/coconut-cookie.jpg';
import almondCookie from '../assets/almond-cookie.jpg';
import blueberryCookie from '../assets/blueberry-cookie.jpg';
import darkChocoSeaSalt from '../assets/Dark_choco_sea_salt.jpg';
import redVelvet from '../assets/Red_velvet.jpg';
import matchaWhiteChoc from '../assets/White_matcha_choc.jpg';
import lemonZest from '../assets/Lemon_zest_cookie.jpg';
import espressoChoc from '../assets/Expresso_Choco_cookie.jpg';
import saltedCaramel from '../assets/Salted_caramel.jpg';
import raisinWalnut from '../assets/Raisin_cookie.jpg';
import pistachioRose from '../assets/Pistachio_rose_cookie.jpg';
import hazelnutPraline from '../assets/Hazelnut_choco_cookie.jpg';
import ketoAlmondButter from '../assets/Keto_Almond_Butter.jpg';


export type Nutrition = {
  protein: number | null;      // g per 100g
  energy: number | null;       // kcal per 100g
  totalFat: number | null;     // g per 100g
  fibre: number | null;        // g per 100g
  totalCarbs: number | null;   // g per 100g
  totalSugar: number | null;   // g per 100g
};

export type CookieData  = {
  id: string;
  name: string;
  price: number;
  description: string;
  src: string;
  tags: string[];      // e.g., ['bestseller', 'eggless']
  tagline?: string;    // short 2-6 word tagline for carousel
  nutrition: Nutrition;
  dietPreference?: string | null; // NEW: e.g., 'Gluten-Free', 'Sugar-Free', 'Vegetarian (Eggless)'
  allergens?: string[]; // NEW: e.g., ['milk', 'wheat', 'peanuts']
};

  // Removed defaultNutrition; each cookie now specifies explicit nutrition values.

  export const cookies: CookieData [] = [
    {
      id: 'choco-cookie',
      name: 'Choco cookie',
      price: 70, // Basic chocolate, medium price
      description: "A delightful classic with rich chocolate chips, perfect for any time.",
      src: chocoChunk,
  tags: ['classic', 'best-seller', 'chocolate'],
  tagline: 'Melted dark perfection.',
  nutrition: { protein: 6, energy: 510, totalFat: 26, fibre: 2.5, totalCarbs: 64, totalSugar: 36 },
      dietPreference: 'Vegetarian (Eggless)',
      allergens: ['milk', 'wheat', 'soy'],
    },
    {
      id: 'oatmeal-cookie',
      name: 'Oatmeal cookie',
      price: 65, // Simple, wholesome, lower price
      description: "Hearty oatmeal cookie, a comforting and traditional treat.",
      src: oatmealRaisin,
  tags: ['classic', 'high-protein'],
  tagline: 'Golden, rustic, slow love.',
  nutrition: { protein: 7, energy: 470, totalFat: 20, fibre: 4.5, totalCarbs: 66, totalSugar: 28 },
      dietPreference: 'Vegetarian (Eggless)',
      allergens: ['milk', 'wheat'],
    },
    {
      id: 'white-choco-cookie',
      name: 'White Choco cookie',
      price: 105, // White chocolate often pricier
      description: "Sweet and creamy white chocolate chunks baked into a soft, chewy cookie.",
      src: whiteChoco,
      tags: ['premium', 'best-seller'],
      nutrition: { protein: 6, energy: 520, totalFat: 27, fibre: 1.8, totalCarbs: 65, totalSugar: 39 },
      dietPreference: 'Vegetarian (Eggless)',
      allergens: ['milk', 'wheat', 'soy'],
    },
    {
      id: 'ginger-cookie',
      name: 'Ginger cookie',
      price: 75, // Aromatic, distinct flavor, medium price
      description: "Spicy and warm ginger cookie with a crisp edge and chewy center.",
      src: gingerCookie,
      tags: ['seasonal', 'sugar-free'],
      nutrition: { protein: 4, energy: 430, totalFat: 18, fibre: 2.2, totalCarbs: 66, totalSugar: 3 },
      dietPreference: 'Sugar-Free',
      allergens: ['wheat', 'milk'],
    },
    {
      id: 'peanut-cookie',
      name: 'Peanut cookie',
      price: 95, // Nut-based, slightly higher
      description: "Rich and nutty, a classic peanut butter cookie with a soft texture.",
      src: peanutCookie,
  tags: ['contains-nuts', 'high-protein', 'best-seller'],
  tagline: 'Crunch with confidence.',
  nutrition: { protein: 14, energy: 540, totalFat: 28, fibre: 3.5, totalCarbs: 52, totalSugar: 24 },
      dietPreference: 'Contains Nuts',
      allergens: ['peanuts', 'milk', 'wheat'],
    },
    {
      id: 'double-choco-cookie',
      name: 'Double Choco cookie',
      price: 85, // More chocolate, slightly higher
      description: "Indulge in deep chocolate flavor with extra chocolate chunks.",
      src: doubleChoco,
      tags: ['chocolate', 'best-seller'],
      nutrition: { protein: 7, energy: 530, totalFat: 28, fibre: 2.4, totalCarbs: 64, totalSugar: 37 },
      dietPreference: 'Vegetarian (Eggless)',
      allergens: ['milk', 'wheat', 'soy'],
    },
    {
      id: 'cranberry-cookie',
      name: 'Cranberry cookie',
      price: 80, // Fruit-based, medium price
      description: "Sweet and tart cranberries baked into a delicious, chewy cookie.",
      src: cranberryCookie,
  tags: ['fruity', 'gluten-free'],
  tagline: 'Tart meets tender.',
  nutrition: { protein: 4, energy: 480, totalFat: 20, fibre: 2.6, totalCarbs: 70, totalSugar: 32 },
      dietPreference: 'Gluten-Free',
      allergens: ['milk'],
    },
    {
      id: 'coconut-cookie',
      name: 'Coconut cookie',
      price: 85, // Distinct flavor, medium-high price
      description: "Tropical delight with shredded coconut for a tender and flavorful experience.",
      src: coconutCookie,
      tags: ['tropical', 'gluten-free'],
      nutrition: { protein: 5, energy: 520, totalFat: 30, fibre: 3.8, totalCarbs: 56, totalSugar: 28 },
      dietPreference: 'Gluten-Free',
      allergens: ['coconut', 'milk'],
    },
    {
      id: 'almond-cookie',
      name: 'Almond cookie',
      price: 120, // As requested, most expensive
      description: "A premium cookie rich with the delicate, nutty flavor of almonds.",
      src: almondCookie,
      tags: ['premium', 'contains-nuts', 'high-protein'],
      nutrition: { protein: 12, energy: 560, totalFat: 32, fibre: 4.2, totalCarbs: 52, totalSugar: 24 },
      dietPreference: 'Contains Nuts',
      allergens: ['almonds', 'tree nuts', 'milk', 'wheat'],
    },
    {
      id: 'blueberry-cookie',
      name: 'Blueberry cookie',
      price: 110, // Fruit and unique flavor, higher price
      description: "Bursting with juicy blueberries, a delightful and fruity treat.",
      src: blueberryCookie,
      tags: ['fruity', 'best-seller'],
      nutrition: { protein: 5, energy: 500, totalFat: 22, fibre: 2.1, totalCarbs: 70, totalSugar: 34 },
      dietPreference: 'Gluten-Free',
      allergens: ['milk', 'wheat'],
    },
    // New cookies (placeholder images; update later)
    {
      id: 'dark-choco-sea-salt',
      name: 'Dark Choco Sea Salt',
      price: 115,
      description: 'Rich dark chocolate with a hint of flaky sea salt.',
  src: darkChocoSeaSalt,
      tags: ['premium', 'chocolate', 'best-seller'],
      tagline: 'Bold. Bitter. Beautiful.',
      nutrition: { protein: 6, energy: 520, totalFat: 28, fibre: 3.0, totalCarbs: 60, totalSugar: 30 },
      dietPreference: 'Vegetarian (Eggless)',
      allergens: ['milk', 'wheat', 'soy'],
    },
    {
      id: 'red-velvet-cookie',
      name: 'Red Velvet Cookie',
      price: 110,
      description: 'Soft red velvet cookie with white chocolate chips.',
  src: redVelvet,
      tags: ['premium', 'best-seller'],
      tagline: 'Drama never tasted this good.',
      nutrition: { protein: 6, energy: 510, totalFat: 26, fibre: 2.0, totalCarbs: 62, totalSugar: 34 },
      dietPreference: 'Vegetarian (Eggless)',
      allergens: ['milk', 'wheat', 'soy'],
    },
    {
      id: 'matcha-white-choc',
      name: 'Matcha White Choc',
      price: 120,
      description: 'Earthy matcha balanced with creamy white chocolate.',
  src: matchaWhiteChoc,
      tags: ['premium'],
      tagline: 'Serenity baked in sweetness.',
      nutrition: { protein: 7, energy: 500, totalFat: 24, fibre: 2.8, totalCarbs: 64, totalSugar: 32 },
      dietPreference: 'Vegetarian (Eggless)',
      allergens: ['milk', 'wheat', 'soy'],
    },
    {
      id: 'lemon-zest-cookie',
      name: 'Lemon Zest Cookie',
      price: 90,
      description: 'Bright and zesty lemon cookie with a crisp edge.',
  src: lemonZest,
      tags: ['fruity'],
      nutrition: { protein: 5, energy: 470, totalFat: 20, fibre: 1.8, totalCarbs: 68, totalSugar: 30 },
      dietPreference: 'Vegetarian (Eggless)',
      allergens: ['milk', 'wheat'],
    },
    {
      id: 'espresso-chip-cookie',
      name: 'Espresso Chip Cookie',
      price: 105,
      description: 'Bold espresso infused dough with dark chocolate chips.',
  src: espressoChoc,
      tags: ['chocolate'],
      nutrition: { protein: 6, energy: 510, totalFat: 26, fibre: 2.5, totalCarbs: 62, totalSugar: 33 },
      dietPreference: 'Vegetarian (Eggless)',
      allergens: ['milk', 'wheat', 'soy'],
    },
    {
      id: 'salted-caramel-cookie',
      name: 'Salted Caramel Cookie',
      price: 115,
      description: 'Buttery caramel swirls topped with flaky sea salt.',
  src: saltedCaramel,
      tags: ['premium', 'best-seller'],
      tagline: 'Gold in every bite.',
      nutrition: { protein: 5, energy: 530, totalFat: 27, fibre: 1.6, totalCarbs: 65, totalSugar: 38 },
      dietPreference: 'Vegetarian (Eggless)',
      allergens: ['milk', 'wheat', 'soy'],
    },
    {
      id: 'raisin-walnut-cookie',
      name: 'Raisin Walnut Cookie',
      price: 95,
      description: 'Chewy raisins and toasted walnuts in a hearty dough.',
  src: raisinWalnut,
      tags: ['classic', 'contains-nuts'],
      nutrition: { protein: 7, energy: 480, totalFat: 22, fibre: 2.9, totalCarbs: 64, totalSugar: 28 },
      dietPreference: 'Contains Nuts',
      allergens: ['walnuts', 'tree nuts', 'wheat', 'milk'],
    },
    {
      id: 'pistachio-rose-cookie',
      name: 'Pistachio Rose Cookie',
      price: 125,
      description: 'Roasted pistachios with a delicate hint of rose.',
  src: pistachioRose,
      tags: ['premium', 'contains-nuts', 'best-seller'],
      nutrition: { protein: 9, energy: 540, totalFat: 29, fibre: 3.2, totalCarbs: 58, totalSugar: 26 },
      dietPreference: 'Contains Nuts',
      allergens: ['pistachios', 'tree nuts', 'milk', 'wheat'],
    },
    {
      id: 'hazelnut-choco-praline',
      name: 'Hazelnut Choco Praline',
      price: 130,
      description: 'Hazelnut praline with chocolate chunks.',
  src: hazelnutPraline,
      tags: ['premium', 'contains-nuts', 'chocolate'],
      nutrition: { protein: 8, energy: 560, totalFat: 31, fibre: 3.0, totalCarbs: 57, totalSugar: 28 },
      dietPreference: 'Contains Nuts',
      allergens: ['hazelnuts', 'tree nuts', 'milk', 'wheat', 'soy'],
    },
    {
      id: 'keto-almond-butter',
      name: 'Keto Almond Butter',
      price: 130,
      description: 'Low-carb almond butter cookie sweetened with erythritol.',
  src: ketoAlmondButter,
      tags: ['gluten-free', 'sugar-free', 'contains-nuts', 'high-protein'],
      nutrition: { protein: 12, energy: 520, totalFat: 36, fibre: 5.0, totalCarbs: 24, totalSugar: 2 },
      dietPreference: 'Gluten-Free',
      allergens: ['almonds', 'tree nuts'],
    },
  ];
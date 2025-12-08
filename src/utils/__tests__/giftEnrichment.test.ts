import { describe, expect, test } from 'vitest';
import { goldenSeasonBoxes } from '@/data/goldenSeasonBoxes';

/**
 * Tests for gift item enrichment logic used in StripeCheckoutFlow and other pages.
 * This validates the gift ID format parsing and goldenSeasonBoxes lookup.
 */
describe('Gift Item Enrichment', () => {
  describe('Gift ID format parsing', () => {
    test('extracts box key from gift:boxKey:uuid format', () => {
      const giftId = 'gift:warm-glow:abc-123-def';
      const parts = giftId.split(':');
      const boxKey = parts.length >= 2 ? parts[1] : null;
      
      expect(boxKey).toBe('warm-glow');
    });

    test('extracts box key from gift:boxKey:timestamp format', () => {
      const giftId = 'gift:midnight-luxe:1702051234567';
      const parts = giftId.split(':');
      const boxKey = parts.length >= 2 ? parts[1] : null;
      
      expect(boxKey).toBe('midnight-luxe');
    });

    test('handles legacy gift:uuid format gracefully', () => {
      const giftId = 'gift:49bceb0a-1234-5678-9abc-def012345678';
      const parts = giftId.split(':');
      const boxKey = parts.length >= 2 ? parts[1] : null;
      
      // Legacy format has UUID in position 1, which won't match any box
      expect(boxKey).toBe('49bceb0a-1234-5678-9abc-def012345678');
      const box = goldenSeasonBoxes.find(b => b.key === boxKey);
      expect(box).toBeUndefined();
    });
  });

  describe('GoldenSeasonBoxes lookup', () => {
    test('finds warm-glow box correctly', () => {
      const box = goldenSeasonBoxes.find(b => b.key === 'warm-glow');
      
      expect(box).toBeDefined();
      expect(box?.title).toBe('Golden Hearth Collection');
      expect(box?.price).toBe(1399);
    });

    test('finds midnight-luxe box correctly', () => {
      const box = goldenSeasonBoxes.find(b => b.key === 'midnight-luxe');
      
      expect(box).toBeDefined();
      expect(box?.title).toBe('Midnight Luxe Box');
      expect(box?.price).toBe(1599);
    });

    test('finds starlight-box correctly', () => {
      const box = goldenSeasonBoxes.find(b => b.key === 'starlight-box');
      
      expect(box).toBeDefined();
      expect(box?.title).toBe('Starlight Reverie Box');
      expect(box?.price).toBe(1699);
    });

    test('returns undefined for unknown box key', () => {
      const box = goldenSeasonBoxes.find(b => b.key === 'unknown-box');
      
      expect(box).toBeUndefined();
    });
  });

  describe('Gift enrichment integration', () => {
    test('enriches gift item with proper name and price', () => {
      const giftId = 'gift:warm-glow:abc-123';
      const parts = giftId.split(':');
      const boxKey = parts.length >= 2 ? parts[1] : null;
      const box = boxKey ? goldenSeasonBoxes.find(b => b.key === boxKey) : null;
      
      const enrichedItem = box 
        ? { 
            id: giftId, 
            name: `Gift: ${box.title}`, 
            price: box.price, 
            image: box.previewImage 
          }
        : { id: giftId, name: giftId, price: 0 };

      expect(enrichedItem.name).toBe('Gift: Golden Hearth Collection');
      expect(enrichedItem.price).toBe(1399);
      expect(enrichedItem.image).toBeDefined();
    });

    test('falls back to ID when box not found', () => {
      const giftId = 'gift:unknown-box:abc-123';
      const parts = giftId.split(':');
      const boxKey = parts.length >= 2 ? parts[1] : null;
      const box = boxKey ? goldenSeasonBoxes.find(b => b.key === boxKey) : null;
      
      const enrichedItem = box 
        ? { id: giftId, name: `Gift: ${box.title}`, price: box.price }
        : { id: giftId, name: giftId, price: 0 };

      expect(enrichedItem.name).toBe(giftId);
      expect(enrichedItem.price).toBe(0);
    });
  });

  describe('Mixed cart handling', () => {
    test('correctly identifies gift items by prefix', () => {
      const cartItems = [
        'gift:warm-glow:abc-123',
        'classic',
        'gift:midnight-luxe:xyz-789',
        'chocolate-chip'
      ];
      
      const giftItems = cartItems.filter(id => id.startsWith('gift:'));
      const regularItems = cartItems.filter(id => !id.startsWith('gift:'));
      
      expect(giftItems).toHaveLength(2);
      expect(regularItems).toHaveLength(2);
      expect(giftItems).toContain('gift:warm-glow:abc-123');
      expect(giftItems).toContain('gift:midnight-luxe:xyz-789');
    });
  });
});

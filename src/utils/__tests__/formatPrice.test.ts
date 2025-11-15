import { describe, expect, test } from 'vitest';
import { formatPrice } from '../formatPrice';

describe('formatPrice', () => {
  test('formats price in INR by default', () => {
    expect(formatPrice(999)).toBe('₹999.00');
  });

  test('formats price with decimal places', () => {
    expect(formatPrice(1234.56)).toBe('₹1,234.56');
  });

  test('formats zero price', () => {
    expect(formatPrice(0)).toBe('₹0.00');
  });

  test('formats large amounts with proper grouping', () => {
    expect(formatPrice(123456.78)).toBe('₹1,23,456.78');
  });

  test('handles negative amounts', () => {
    expect(formatPrice(-500)).toBe('-₹500.00');
  });

  test('supports custom currency', () => {
    const result = formatPrice(1000, 'USD');
    expect(result).toContain('1,000');
  });

  test('truncates to 2 decimal places', () => {
    expect(formatPrice(99.999)).toBe('₹100.00');
  });
});

import { describe, it, expect } from 'vitest';
import { toDisplayText, toRawValue } from '../src/schema/valueDisplay';

// Lab percentages (Plan 83 / D2): stored as 0..1 fractions on ratio/proportion,
// rendered as percentages via multiplier: 100.
const PCT = { multiplier: 100 };

describe('toDisplayText', () => {
  it('renders a raw fraction in the display scale', () => {
    expect(toDisplayText(0.42, PCT)).toBe('42');
    expect(toDisplayText(1, PCT)).toBe('100');
    expect(toDisplayText(0, PCT)).toBe('0');
  });

  it('strips binary-float noise introduced by scaling', () => {
    // Not every fraction scales cleanly: 0.29 * 100 === 28.999999999999996.
    // Rendering the product raw would show a hematocrit of 29% as "28.999999999999996".
    expect(0.29 * 100).not.toBe(29);
    expect(toDisplayText(0.29, PCT)).toBe('29');
    expect(toDisplayText(0.58, PCT)).toBe('58');
  });

  it('keeps genuine decimals — HbA1c 5.4% must not truncate to 5', () => {
    expect(toDisplayText(0.054, PCT)).toBe('5.4');
    expect(toDisplayText(0.425, PCT)).toBe('42.5');
  });

  it('honours an explicit precision', () => {
    expect(toDisplayText(0.054, { multiplier: 100, precision: 0 })).toBe('5');
    expect(toDisplayText(0.054, { multiplier: 100, precision: 2 })).toBe('5.40');
  });

  it('is a no-op without a display block (unscaled items keep prior behaviour)', () => {
    expect(toDisplayText(72)).toBe('72');
    expect(toDisplayText(72, {})).toBe('72');
  });

  it('renders empty for absent values', () => {
    expect(toDisplayText(null, PCT)).toBe('');
    expect(toDisplayText(undefined, PCT)).toBe('');
    expect(toDisplayText(NaN, PCT)).toBe('');
  });
});

describe('toRawValue', () => {
  it('converts a typed display value back to the stored fraction', () => {
    expect(toRawValue('42', PCT)).toBe(0.42);
    expect(toRawValue('100', PCT)).toBe(1);
    expect(toRawValue('0', PCT)).toBe(0);
  });

  it('keeps float noise out of storage', () => {
    // 5.4 / 100 === 0.054000000000000006 — that must not be what gets persisted.
    expect(5.4 / 100).not.toBe(0.054);
    expect(toRawValue('5.4', PCT)).toBe(0.054);
    expect(toRawValue('13.7', PCT)).toBe(0.137);
  });

  it('returns null for empty input', () => {
    expect(toRawValue('', PCT)).toBeNull();
    expect(toRawValue('   ', PCT)).toBeNull();
  });

  it('returns undefined for transient text so it is not stored', () => {
    expect(toRawValue('-', PCT)).toBeUndefined();
    expect(toRawValue('abc', PCT)).toBeUndefined();
  });

  it('is a no-op without a multiplier', () => {
    expect(toRawValue('72')).toBe(72);
    expect(toRawValue('72.5', {})).toBe(72.5);
  });
});

describe('round-trip', () => {
  it('typed -> stored -> redisplayed is stable for clinical values', () => {
    for (const typed of ['42', '5.4', '42.5', '0', '100', '13.7', '0.1', '98.6']) {
      const stored = toRawValue(typed, PCT) as number;
      expect(toDisplayText(stored, PCT)).toBe(typed);
    }
  });
});

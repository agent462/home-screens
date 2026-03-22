import { describe, it, expect } from 'vitest';
import { deepMergeConfig, compareSemver } from '../plugin-loader';

describe('compareSemver', () => {
  it('returns 0 for equal versions', () => {
    expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
    expect(compareSemver('0.16.0', '0.16.0')).toBe(0);
  });

  it('correctly compares major versions', () => {
    expect(compareSemver('2.0.0', '1.0.0')).toBeGreaterThan(0);
    expect(compareSemver('1.0.0', '2.0.0')).toBeLessThan(0);
  });

  it('correctly compares minor versions', () => {
    expect(compareSemver('1.2.0', '1.1.0')).toBeGreaterThan(0);
    expect(compareSemver('1.1.0', '1.2.0')).toBeLessThan(0);
  });

  it('correctly compares patch versions', () => {
    expect(compareSemver('1.0.2', '1.0.1')).toBeGreaterThan(0);
    expect(compareSemver('1.0.1', '1.0.2')).toBeLessThan(0);
  });

  it('handles double-digit version numbers correctly (not lexicographic)', () => {
    // This was the original bug: "9.0.0" > "10.0.0" is true lexicographically
    expect(compareSemver('9.0.0', '10.0.0')).toBeLessThan(0);
    expect(compareSemver('10.0.0', '9.0.0')).toBeGreaterThan(0);
    expect(compareSemver('1.9.0', '1.10.0')).toBeLessThan(0);
    expect(compareSemver('1.0.9', '1.0.10')).toBeLessThan(0);
  });

  it('handles missing segments gracefully', () => {
    expect(compareSemver('1.0.0', '1')).toBe(0);
    expect(compareSemver('1.2', '1.2.0')).toBe(0);
  });
});

describe('deepMergeConfig', () => {
  it('adds missing keys from source', () => {
    const target = { a: 1 };
    const source = { a: 99, b: 2 };
    const result = deepMergeConfig(target, source);
    expect(result).toEqual({ a: 1, b: 2 });
  });

  it('preserves existing values in target', () => {
    const target = { a: 1, b: 'hello' };
    const source = { a: 99, b: 'world' };
    const result = deepMergeConfig(target, source);
    expect(result).toEqual({ a: 1, b: 'hello' });
  });

  it('deep-merges nested objects', () => {
    const target = { nested: { a: 1 } };
    const source = { nested: { a: 99, b: 2 } };
    const result = deepMergeConfig(target, source);
    expect(result).toEqual({ nested: { a: 1, b: 2 } });
  });

  it('preserves arrays without merging them recursively', () => {
    const target = { items: [1, 2, 3] };
    const source = { items: [4, 5] };
    const result = deepMergeConfig(target, source);
    expect(result).toEqual({ items: [1, 2, 3] });
  });

  it('adds new arrays from source', () => {
    const target = {};
    const source = { items: [1, 2] };
    const result = deepMergeConfig(target, source);
    expect(result).toEqual({ items: [1, 2] });
  });

  it('handles null values in target (preserves them)', () => {
    const target = { a: null };
    const source = { a: { nested: true } };
    const result = deepMergeConfig(target, source);
    // null is not an object, so target value is preserved
    expect(result).toEqual({ a: null });
  });

  it('handles null values in source (adds them as new keys)', () => {
    const target = {};
    const source = { a: null };
    const result = deepMergeConfig(target, source);
    expect(result).toEqual({ a: null });
  });

  it('handles empty objects', () => {
    expect(deepMergeConfig({}, {})).toEqual({});
    expect(deepMergeConfig({ a: 1 }, {})).toEqual({ a: 1 });
    expect(deepMergeConfig({}, { a: 1 })).toEqual({ a: 1 });
  });

  it('handles deeply nested structures', () => {
    const target = { l1: { l2: { l3: { existing: true } } } };
    const source = { l1: { l2: { l3: { existing: false, newField: 42 }, newL3: 'hello' } } };
    const result = deepMergeConfig(target, source);
    expect(result).toEqual({
      l1: { l2: { l3: { existing: true, newField: 42 }, newL3: 'hello' } },
    });
  });

  it('does not mutate the original target', () => {
    const target = { a: 1 };
    const source = { b: 2 };
    deepMergeConfig(target, source);
    expect(target).toEqual({ a: 1 });
  });

  it('does not mutate the original source', () => {
    const target = {};
    const source = { a: { nested: 1 } };
    const result = deepMergeConfig(target, source);
    // Shallow copy means the nested ref is shared — that's fine for read-only defaults
    expect(source).toEqual({ a: { nested: 1 } });
    expect(result).toEqual({ a: { nested: 1 } });
  });
});

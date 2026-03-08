import { describe, it, expect } from 'vitest';
import { compareSemver, parseVersionTags } from '../version';

describe('compareSemver', () => {
  it('returns 0 for equal versions', () => {
    expect(compareSemver('1.0.0', '1.0.0')).toBe(0);
  });

  it('returns positive when a > b', () => {
    expect(compareSemver('2.0.0', '1.0.0')).toBeGreaterThan(0);
    expect(compareSemver('1.1.0', '1.0.0')).toBeGreaterThan(0);
    expect(compareSemver('1.0.1', '1.0.0')).toBeGreaterThan(0);
  });

  it('returns negative when a < b', () => {
    expect(compareSemver('1.0.0', '2.0.0')).toBeLessThan(0);
    expect(compareSemver('0.9.0', '1.0.0')).toBeLessThan(0);
  });

  it('handles multi-digit version numbers', () => {
    expect(compareSemver('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(compareSemver('10.0.0', '9.0.0')).toBeGreaterThan(0);
  });
});

describe('parseVersionTags', () => {
  it('parses standard git show-ref output', () => {
    const input = [
      'abc1234abc1234abc1234abc1234abc1234abc1234 refs/tags/v0.1.0',
      'def5678def5678def5678def5678def5678def5678 refs/tags/v0.2.0',
      'aaa9012aaa9012aaa9012aaa9012aaa9012aaa9012 refs/tags/v1.0.0',
    ].join('\n');

    const tags = parseVersionTags(input);
    expect(tags).toHaveLength(3);
    // Should be sorted descending
    expect(tags[0].version).toBe('1.0.0');
    expect(tags[1].version).toBe('0.2.0');
    expect(tags[2].version).toBe('0.1.0');
  });

  it('ignores non-version tags', () => {
    const input = [
      'abc1234abc1234abc1234abc1234abc1234abc1234 refs/tags/v0.1.0',
      'def5678def5678def5678def5678def5678def5678 refs/tags/latest',
      'aaa9012aaa9012aaa9012aaa9012aaa9012aaa9012 refs/tags/release-candidate',
    ].join('\n');

    const tags = parseVersionTags(input);
    expect(tags).toHaveLength(1);
    expect(tags[0].tag).toBe('v0.1.0');
  });

  it('handles tags without v prefix', () => {
    const input = 'abc1234abc1234abc1234abc1234abc1234abc1234 refs/tags/1.0.0\n';
    const tags = parseVersionTags(input);
    expect(tags).toHaveLength(1);
    expect(tags[0].version).toBe('1.0.0');
  });

  it('handles empty input', () => {
    expect(parseVersionTags('')).toHaveLength(0);
  });
});

import { describe, it, expect } from 'vitest';
import { inferWidget } from '../PluginConfigRenderer';
import type { PluginConfigProperty } from '@/types/plugins';

describe('inferWidget', () => {
  it('infers toggle for boolean', () => {
    expect(inferWidget({ type: 'boolean' })).toBe('toggle');
  });

  it('infers select for enum', () => {
    expect(inferWidget({ type: 'string', enum: ['a', 'b'] })).toBe('select');
  });

  it('infers slider for number with min and max', () => {
    expect(inferWidget({ type: 'number', minimum: 0, maximum: 100 })).toBe('slider');
  });

  it('infers number for number without bounds', () => {
    expect(inferWidget({ type: 'number' })).toBe('number');
  });

  it('infers number for number with only min', () => {
    expect(inferWidget({ type: 'number', minimum: 0 })).toBe('number');
  });

  it('infers text for string', () => {
    expect(inferWidget({ type: 'string' })).toBe('text');
  });

  it('infers array for type array', () => {
    expect(inferWidget({ type: 'array', items: { type: 'string' } })).toBe('array');
  });

  it('infers object for type object', () => {
    expect(inferWidget({ type: 'object', properties: { name: { type: 'string' } } })).toBe('object');
  });

  it('prefers enum over number range (select wins)', () => {
    expect(inferWidget({ type: 'number', enum: [1, 2, 3], minimum: 1, maximum: 3 })).toBe('select');
  });
});

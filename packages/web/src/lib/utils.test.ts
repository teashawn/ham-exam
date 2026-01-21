import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('should merge class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar');
  });

  it('should handle conditional classes', () => {
    expect(cn('base', true && 'included', false && 'excluded')).toBe('base included');
  });

  it('should handle undefined values', () => {
    expect(cn('base', undefined, 'another')).toBe('base another');
  });

  it('should merge Tailwind classes correctly', () => {
    // twMerge should handle conflicting Tailwind classes
    expect(cn('p-4', 'p-2')).toBe('p-2');
    expect(cn('text-red-500', 'text-blue-500')).toBe('text-blue-500');
  });

  it('should handle arrays', () => {
    expect(cn(['foo', 'bar'])).toBe('foo bar');
  });

  it('should handle objects', () => {
    expect(cn({ foo: true, bar: false, baz: true })).toBe('foo baz');
  });

  it('should handle empty input', () => {
    expect(cn()).toBe('');
    expect(cn('')).toBe('');
  });
});

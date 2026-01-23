import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSwipe } from './useSwipe';
import type { TouchEvent } from 'react';

function createTouchEvent(clientX: number, clientY: number): TouchEvent {
  return {
    touches: [{ clientX, clientY }],
    changedTouches: [{ clientX, clientY }],
  } as unknown as TouchEvent;
}

describe('useSwipe', () => {
  it('calls onSwipeLeft when swiping left beyond threshold', () => {
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() => useSwipe({ onSwipeLeft }));

    result.current.onTouchStart(createTouchEvent(200, 100));
    result.current.onTouchEnd(createTouchEvent(100, 100));

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
  });

  it('calls onSwipeRight when swiping right beyond threshold', () => {
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() => useSwipe({ onSwipeRight }));

    result.current.onTouchStart(createTouchEvent(100, 100));
    result.current.onTouchEnd(createTouchEvent(200, 100));

    expect(onSwipeRight).toHaveBeenCalledTimes(1);
  });

  it('does not trigger when horizontal movement is below threshold', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() => useSwipe({ onSwipeLeft, onSwipeRight }));

    result.current.onTouchStart(createTouchEvent(100, 100));
    result.current.onTouchEnd(createTouchEvent(70, 100));

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('does not trigger when vertical movement exceeds horizontal', () => {
    const onSwipeLeft = vi.fn();
    const onSwipeRight = vi.fn();
    const { result } = renderHook(() => useSwipe({ onSwipeLeft, onSwipeRight }));

    result.current.onTouchStart(createTouchEvent(100, 100));
    result.current.onTouchEnd(createTouchEvent(40, 300));

    expect(onSwipeLeft).not.toHaveBeenCalled();
    expect(onSwipeRight).not.toHaveBeenCalled();
  });

  it('uses custom threshold', () => {
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() => useSwipe({ onSwipeLeft, threshold: 100 }));

    // 60px swipe - below custom threshold of 100
    result.current.onTouchStart(createTouchEvent(200, 100));
    result.current.onTouchEnd(createTouchEvent(140, 100));

    expect(onSwipeLeft).not.toHaveBeenCalled();

    // 110px swipe - above custom threshold of 100
    result.current.onTouchStart(createTouchEvent(200, 100));
    result.current.onTouchEnd(createTouchEvent(90, 100));

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
  });

  it('does not throw when callbacks are not provided', () => {
    const { result } = renderHook(() => useSwipe({}));

    expect(() => {
      result.current.onTouchStart(createTouchEvent(200, 100));
      result.current.onTouchEnd(createTouchEvent(100, 100));
    }).not.toThrow();

    expect(() => {
      result.current.onTouchStart(createTouchEvent(100, 100));
      result.current.onTouchEnd(createTouchEvent(200, 100));
    }).not.toThrow();
  });

  it('triggers at exactly the threshold distance', () => {
    const onSwipeLeft = vi.fn();
    const { result } = renderHook(() => useSwipe({ onSwipeLeft, threshold: 50 }));

    result.current.onTouchStart(createTouchEvent(150, 100));
    result.current.onTouchEnd(createTouchEvent(100, 100));

    expect(onSwipeLeft).toHaveBeenCalledTimes(1);
  });
});

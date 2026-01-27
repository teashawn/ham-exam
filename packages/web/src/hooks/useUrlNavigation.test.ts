import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import type { AppView } from '../types';
import { parseUrl, buildUrl, useUrlNavigation, type UrlState } from './useUrlNavigation';

// Mock window.location
const mockLocation = {
  pathname: '/ham-exam/',
  search: '',
  hash: '',
  href: 'http://localhost/ham-exam/',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
});

// Mock window.history
const mockPushState = vi.fn();
Object.defineProperty(window, 'history', {
  value: {
    pushState: mockPushState,
    replaceState: vi.fn(),
    back: vi.fn(),
    forward: vi.fn(),
    go: vi.fn(),
    state: null,
    length: 1,
    scrollRestoration: 'auto' as const,
  },
  writable: true,
});

// Helper to reset mocks
const resetMocks = () => {
  mockLocation.pathname = '/ham-exam/';
  mockLocation.search = '';
  mockPushState.mockClear();
};

describe('useUrlNavigation', () => {
  beforeEach(() => {
    resetMocks();
    vi.clearAllMocks();
  });

  afterEach(() => {
    resetMocks();
  });

  describe('parseUrl', () => {
    it('should parse root path as login', () => {
      mockLocation.pathname = '/ham-exam/';
      mockLocation.search = '';

      const result = parseUrl();
      expect(result.view).toBe('login');
    });

    it('should parse base path without trailing slash as login', () => {
      mockLocation.pathname = '/ham-exam';
      mockLocation.search = '';

      const result = parseUrl();
      expect(result.view).toBe('login');
    });

    it('should parse /login as login', () => {
      mockLocation.pathname = '/ham-exam/login';
      mockLocation.search = '';

      const result = parseUrl();
      expect(result.view).toBe('login');
    });

    it('should parse /mode-select', () => {
      mockLocation.pathname = '/ham-exam/mode-select';
      mockLocation.search = '';

      const result = parseUrl();
      expect(result.view).toBe('mode-select');
    });

    it('should parse /exam-home', () => {
      mockLocation.pathname = '/ham-exam/exam-home';
      mockLocation.search = '';

      const result = parseUrl();
      expect(result.view).toBe('exam-home');
    });

    it('should parse /study-home', () => {
      mockLocation.pathname = '/ham-exam/study-home';
      mockLocation.search = '';

      const result = parseUrl();
      expect(result.view).toBe('study-home');
    });

    it('should parse /config', () => {
      mockLocation.pathname = '/ham-exam/config';
      mockLocation.search = '';

      const result = parseUrl();
      expect(result.view).toBe('config');
    });

    it('should parse /exam with question index', () => {
      mockLocation.pathname = '/ham-exam/exam';
      mockLocation.search = '?q=5';

      const result = parseUrl();
      expect(result.view).toBe('exam');
      expect(result.questionIndex).toBe(4); // 1-based to 0-based
    });

    it('should parse /study with section and question', () => {
      mockLocation.pathname = '/ham-exam/study';
      mockLocation.search = '?section=2&q=10';

      const result = parseUrl();
      expect(result.view).toBe('study');
      expect(result.sectionNumber).toBe(2);
      expect(result.questionIndex).toBe(9); // 1-based to 0-based
    });

    it('should parse /study with fsrs mode', () => {
      mockLocation.pathname = '/ham-exam/study';
      mockLocation.search = '?fsrs=1';

      const result = parseUrl();
      expect(result.view).toBe('study');
      expect(result.fsrsMode).toBe(true);
    });

    it('should parse /study with fsrs=true', () => {
      mockLocation.pathname = '/ham-exam/study';
      mockLocation.search = '?fsrs=true';

      const result = parseUrl();
      expect(result.view).toBe('study');
      expect(result.fsrsMode).toBe(true);
    });

    it('should parse /results', () => {
      mockLocation.pathname = '/ham-exam/results';
      mockLocation.search = '';

      const result = parseUrl();
      expect(result.view).toBe('results');
    });

    it('should parse /history', () => {
      mockLocation.pathname = '/ham-exam/history';
      mockLocation.search = '';

      const result = parseUrl();
      expect(result.view).toBe('history');
    });

    it('should default to login for unknown paths', () => {
      mockLocation.pathname = '/ham-exam/unknown';
      mockLocation.search = '';

      const result = parseUrl();
      expect(result.view).toBe('login');
    });

    it('should ignore invalid question index', () => {
      mockLocation.pathname = '/ham-exam/exam';
      mockLocation.search = '?q=abc';

      const result = parseUrl();
      expect(result.view).toBe('exam');
      expect(result.questionIndex).toBeUndefined();
    });

    it('should ignore question index less than 1', () => {
      mockLocation.pathname = '/ham-exam/exam';
      mockLocation.search = '?q=0';

      const result = parseUrl();
      expect(result.view).toBe('exam');
      expect(result.questionIndex).toBeUndefined();
    });

    it('should ignore invalid section number', () => {
      mockLocation.pathname = '/ham-exam/study';
      mockLocation.search = '?section=abc';

      const result = parseUrl();
      expect(result.view).toBe('study');
      expect(result.sectionNumber).toBeUndefined();
    });

    it('should ignore section number out of range (0)', () => {
      mockLocation.pathname = '/ham-exam/study';
      mockLocation.search = '?section=0';

      const result = parseUrl();
      expect(result.view).toBe('study');
      expect(result.sectionNumber).toBeUndefined();
    });

    it('should ignore section number out of range (4)', () => {
      mockLocation.pathname = '/ham-exam/study';
      mockLocation.search = '?section=4';

      const result = parseUrl();
      expect(result.view).toBe('study');
      expect(result.sectionNumber).toBeUndefined();
    });
  });

  describe('buildUrl', () => {
    it('should build URL for login', () => {
      const state: UrlState = { view: 'login' };
      expect(buildUrl(state)).toBe('/ham-exam/');
    });

    it('should build URL for mode-select', () => {
      const state: UrlState = { view: 'mode-select' };
      expect(buildUrl(state)).toBe('/ham-exam/mode-select');
    });

    it('should build URL for exam-home', () => {
      const state: UrlState = { view: 'exam-home' };
      expect(buildUrl(state)).toBe('/ham-exam/exam-home');
    });

    it('should build URL for study-home', () => {
      const state: UrlState = { view: 'study-home' };
      expect(buildUrl(state)).toBe('/ham-exam/study-home');
    });

    it('should build URL for config', () => {
      const state: UrlState = { view: 'config' };
      expect(buildUrl(state)).toBe('/ham-exam/config');
    });

    it('should build URL for exam with question index', () => {
      const state: UrlState = { view: 'exam', questionIndex: 4 };
      expect(buildUrl(state)).toBe('/ham-exam/exam?q=5'); // 0-based to 1-based
    });

    it('should build URL for study with all params', () => {
      const state: UrlState = {
        view: 'study',
        sectionNumber: 2,
        questionIndex: 9,
        fsrsMode: true,
      };
      expect(buildUrl(state)).toBe('/ham-exam/study?q=10&section=2&fsrs=1');
    });

    it('should build URL for study with only section', () => {
      const state: UrlState = { view: 'study', sectionNumber: 1 };
      expect(buildUrl(state)).toBe('/ham-exam/study?section=1');
    });

    it('should build URL for results', () => {
      const state: UrlState = { view: 'results' };
      expect(buildUrl(state)).toBe('/ham-exam/results');
    });

    it('should build URL for history', () => {
      const state: UrlState = { view: 'history' };
      expect(buildUrl(state)).toBe('/ham-exam/history');
    });

    it('should handle questionIndex of 0', () => {
      const state: UrlState = { view: 'exam', questionIndex: 0 };
      expect(buildUrl(state)).toBe('/ham-exam/exam?q=1');
    });

    it('should not include fsrsMode when false', () => {
      const state: UrlState = { view: 'study', fsrsMode: false };
      expect(buildUrl(state)).toBe('/ham-exam/study');
    });
  });

  describe('useUrlNavigation hook', () => {
    it('should provide getInitialState function', () => {
      mockLocation.pathname = '/ham-exam/mode-select';
      mockLocation.search = '';

      const onUrlChange = vi.fn();
      const { result } = renderHook(() =>
        useUrlNavigation({
          view: 'mode-select',
          questionIndex: 0,
          sectionNumber: undefined,
          fsrsMode: false,
          onUrlChange,
        })
      );

      const initialState = result.current.getInitialState();
      expect(initialState.view).toBe('mode-select');
    });

    it('should update URL when view changes', () => {
      mockLocation.pathname = '/ham-exam/';
      mockLocation.search = '';

      const onUrlChange = vi.fn();
      const { rerender } = renderHook(
        ({ view }: { view: AppView }) =>
          useUrlNavigation({
            view,
            questionIndex: 0,
            sectionNumber: undefined,
            fsrsMode: false,
            onUrlChange,
          }),
        { initialProps: { view: 'login' as AppView } }
      );

      // First rerender doesn't push because it's still initial mount
      rerender({ view: 'mode-select' });

      // URL should be updated
      expect(mockPushState).toHaveBeenCalledWith(
        { view: 'mode-select' },
        '',
        '/ham-exam/mode-select'
      );
    });

    it('should update URL with question index for exam view', () => {
      mockLocation.pathname = '/ham-exam/';
      mockLocation.search = '';

      const onUrlChange = vi.fn();
      const { rerender } = renderHook(
        ({ view, questionIndex }: { view: AppView; questionIndex: number }) =>
          useUrlNavigation({
            view,
            questionIndex,
            sectionNumber: undefined,
            fsrsMode: false,
            onUrlChange,
          }),
        { initialProps: { view: 'login' as AppView, questionIndex: 0 } }
      );

      rerender({ view: 'exam', questionIndex: 5 });

      expect(mockPushState).toHaveBeenCalledWith(
        { view: 'exam', questionIndex: 5 },
        '',
        '/ham-exam/exam?q=6'
      );
    });

    it('should update URL with section and question for study view', () => {
      mockLocation.pathname = '/ham-exam/';
      mockLocation.search = '';

      const onUrlChange = vi.fn();
      const { rerender } = renderHook(
        ({ view, questionIndex, sectionNumber }: { view: AppView; questionIndex: number; sectionNumber?: number }) =>
          useUrlNavigation({
            view,
            questionIndex,
            sectionNumber,
            fsrsMode: false,
            onUrlChange,
          }),
        {
          initialProps: {
            view: 'login' as AppView,
            questionIndex: 0,
            sectionNumber: undefined as number | undefined,
          },
        }
      );

      rerender({ view: 'study', questionIndex: 10, sectionNumber: 2 });

      expect(mockPushState).toHaveBeenCalledWith(
        { view: 'study', questionIndex: 10, sectionNumber: 2 },
        '',
        '/ham-exam/study?q=11&section=2'
      );
    });

    it('should include fsrsMode in URL for study view', () => {
      mockLocation.pathname = '/ham-exam/';
      mockLocation.search = '';

      const onUrlChange = vi.fn();
      const { rerender } = renderHook(
        ({ view, fsrsMode }: { view: AppView; fsrsMode: boolean }) =>
          useUrlNavigation({
            view,
            questionIndex: 0,
            sectionNumber: undefined,
            fsrsMode,
            onUrlChange,
          }),
        { initialProps: { view: 'login' as AppView, fsrsMode: false } }
      );

      rerender({ view: 'study', fsrsMode: true });

      expect(mockPushState).toHaveBeenCalledWith(
        { view: 'study', questionIndex: 0, fsrsMode: true },
        '',
        '/ham-exam/study?q=1&fsrs=1'
      );
    });

    it('should call onUrlChange when popstate event fires', async () => {
      mockLocation.pathname = '/ham-exam/exam';
      mockLocation.search = '?q=5';

      const onUrlChange = vi.fn();
      renderHook(() =>
        useUrlNavigation({
          view: 'exam',
          questionIndex: 4,
          sectionNumber: undefined,
          fsrsMode: false,
          onUrlChange,
        })
      );

      // Simulate browser back button
      mockLocation.pathname = '/ham-exam/mode-select';
      mockLocation.search = '';

      await act(async () => {
        window.dispatchEvent(new PopStateEvent('popstate'));
      });

      expect(onUrlChange).toHaveBeenCalledWith({
        view: 'mode-select',
      });
    });

    it('should not push same URL twice', () => {
      mockLocation.pathname = '/ham-exam/';
      mockLocation.search = '';

      const onUrlChange = vi.fn();
      const { rerender } = renderHook(
        ({ view }: { view: AppView }) =>
          useUrlNavigation({
            view,
            questionIndex: 0,
            sectionNumber: undefined,
            fsrsMode: false,
            onUrlChange,
          }),
        { initialProps: { view: 'login' as AppView } }
      );

      // Change to mode-select
      rerender({ view: 'mode-select' });
      const callCount = mockPushState.mock.calls.length;

      // Rerender with same view - should not push again
      rerender({ view: 'mode-select' });
      expect(mockPushState.mock.calls.length).toBe(callCount);
    });

    it('should cleanup popstate listener on unmount', () => {
      const removeEventListenerSpy = vi.spyOn(window, 'removeEventListener');

      const onUrlChange = vi.fn();
      const { unmount } = renderHook(() =>
        useUrlNavigation({
          view: 'login',
          questionIndex: 0,
          sectionNumber: undefined,
          fsrsMode: false,
          onUrlChange,
        })
      );

      unmount();

      expect(removeEventListenerSpy).toHaveBeenCalledWith(
        'popstate',
        expect.any(Function)
      );

      removeEventListenerSpy.mockRestore();
    });
  });
});

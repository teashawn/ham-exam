import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  getStoredTheme,
  setStoredTheme,
  getSystemTheme,
  getEffectiveTheme,
  applyTheme,
  initTheme,
  type Theme,
} from './theme';

describe('theme utilities', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clear document classes
    document.documentElement.classList.remove('dark');
    // Reset matchMedia mock
    vi.clearAllMocks();
  });

  describe('getStoredTheme', () => {
    it('should return system as default when no theme is stored', () => {
      expect(getStoredTheme()).toBe('system');
    });

    it('should return stored light theme', () => {
      localStorage.setItem('ham-exam-theme', 'light');
      expect(getStoredTheme()).toBe('light');
    });

    it('should return stored dark theme', () => {
      localStorage.setItem('ham-exam-theme', 'dark');
      expect(getStoredTheme()).toBe('dark');
    });

    it('should return stored system theme', () => {
      localStorage.setItem('ham-exam-theme', 'system');
      expect(getStoredTheme()).toBe('system');
    });

    it('should return system for invalid stored values', () => {
      localStorage.setItem('ham-exam-theme', 'invalid');
      expect(getStoredTheme()).toBe('system');
    });
  });

  describe('setStoredTheme', () => {
    it('should store light theme', () => {
      setStoredTheme('light');
      expect(localStorage.getItem('ham-exam-theme')).toBe('light');
    });

    it('should store dark theme', () => {
      setStoredTheme('dark');
      expect(localStorage.getItem('ham-exam-theme')).toBe('dark');
    });

    it('should store system theme', () => {
      setStoredTheme('system');
      expect(localStorage.getItem('ham-exam-theme')).toBe('system');
    });
  });

  describe('getSystemTheme', () => {
    it('should return dark when system prefers dark mode', () => {
      // matchMedia is already mocked in setup.ts to return matches: false
      // We need to override it for this test
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      expect(getSystemTheme()).toBe('dark');
    });

    it('should return light when system prefers light mode', () => {
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      expect(getSystemTheme()).toBe('light');
    });
  });

  describe('getEffectiveTheme', () => {
    it('should return light when theme is light', () => {
      expect(getEffectiveTheme('light')).toBe('light');
    });

    it('should return dark when theme is dark', () => {
      expect(getEffectiveTheme('dark')).toBe('dark');
    });

    it('should return system theme when theme is system (dark)', () => {
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      expect(getEffectiveTheme('system')).toBe('dark');
    });

    it('should return system theme when theme is system (light)', () => {
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      expect(getEffectiveTheme('system')).toBe('light');
    });
  });

  describe('applyTheme', () => {
    it('should add dark class when theme is dark', () => {
      applyTheme('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class when theme is light', () => {
      document.documentElement.classList.add('dark');
      applyTheme('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('should add dark class when theme is system and system prefers dark', () => {
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      applyTheme('system');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should remove dark class when theme is system and system prefers light', () => {
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      document.documentElement.classList.add('dark');
      applyTheme('system');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  describe('initTheme', () => {
    it('should initialize with stored theme', () => {
      localStorage.setItem('ham-exam-theme', 'dark');
      const theme = initTheme();
      expect(theme).toBe('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should initialize with system theme when no theme is stored', () => {
      const theme = initTheme();
      expect(theme).toBe('system');
    });

    it('should set up event listener for system preference changes', () => {
      const mockAddEventListener = vi.fn();
      const mockMediaQuery = {
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: mockAddEventListener,
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };

      window.matchMedia = vi.fn().mockReturnValue(mockMediaQuery);

      initTheme();

      expect(mockAddEventListener).toHaveBeenCalledWith('change', expect.any(Function));
    });

    it('should reapply theme when system preference changes and theme is system', () => {
      localStorage.setItem('ham-exam-theme', 'system');

      let changeHandler: (() => void) | undefined;
      const mockAddEventListener = vi.fn((event, handler) => {
        if (event === 'change') {
          changeHandler = handler as () => void;
        }
      });

      const mockMediaQuery = {
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: mockAddEventListener,
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };

      window.matchMedia = vi.fn().mockReturnValue(mockMediaQuery);

      initTheme();

      // Simulate system preference change to dark
      window.matchMedia = vi.fn().mockImplementation((query) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      if (changeHandler) {
        changeHandler();
      }

      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('should not reapply theme when system preference changes and theme is not system', () => {
      localStorage.setItem('ham-exam-theme', 'light');

      let changeHandler: (() => void) | undefined;
      const mockAddEventListener = vi.fn((event, handler) => {
        if (event === 'change') {
          changeHandler = handler as () => void;
        }
      });

      const mockMediaQuery = {
        matches: false,
        media: '(prefers-color-scheme: dark)',
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: mockAddEventListener,
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };

      window.matchMedia = vi.fn().mockReturnValue(mockMediaQuery);

      initTheme();

      // Ensure light theme is applied (no dark class)
      expect(document.documentElement.classList.contains('dark')).toBe(false);

      // Change localStorage to dark to verify the listener checks current theme
      localStorage.setItem('ham-exam-theme', 'dark');

      // Simulate system preference change
      if (changeHandler) {
        changeHandler();
      }

      // Theme should still be light because stored theme is now dark, not system
      // Actually, the handler will check getStoredTheme() which now returns 'dark'
      // So it won't apply theme. Let me reconsider this test.
      // The handler only applies theme if currentTheme === 'system'
      // So if we keep it as 'light', it should not change
      localStorage.setItem('ham-exam-theme', 'light');

      if (changeHandler) {
        changeHandler();
      }

      // Should remain light (no dark class) because stored theme is light, not system
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });
});

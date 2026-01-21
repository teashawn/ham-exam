import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ThemeToggle } from './theme-toggle';

describe('ThemeToggle', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clear document classes
    document.documentElement.classList.remove('dark');
    // Reset matchMedia mock
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<ThemeToggle />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should render with custom className', () => {
    render(<ThemeToggle className="custom-class" />);
    expect(screen.getByRole('button')).toHaveClass('custom-class');
  });

  it('should show placeholder before mounting', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');
    // Before mounting, button should have aria-label but no icon
    expect(button).toHaveAttribute('aria-label', 'Toggle theme');
  });

  it('should show Moon icon in light mode after mounting', async () => {
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

    render(<ThemeToggle />);

    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Switch to dark mode');
    });
  });

  it('should show Sun icon in dark mode after mounting', async () => {
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

    render(<ThemeToggle />);

    await waitFor(() => {
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-label', 'Switch to light mode');
    });
  });

  it('should toggle from system (light) to dark when clicked', async () => {
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

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to dark mode');
    });

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // After clicking, theme should be dark
    expect(localStorage.getItem('ham-exam-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should toggle from system (dark) to light when clicked', async () => {
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

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to light mode');
    });

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // After clicking, theme should be light
    expect(localStorage.getItem('ham-exam-theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should toggle from dark to light when clicked', async () => {
    localStorage.setItem('ham-exam-theme', 'dark');
    document.documentElement.classList.add('dark');

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

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to light mode');
    });

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // After clicking, theme should be light
    expect(localStorage.getItem('ham-exam-theme')).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('should toggle from light to dark when clicked', async () => {
    localStorage.setItem('ham-exam-theme', 'light');
    document.documentElement.classList.remove('dark');

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

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Switch to dark mode');
    });

    const button = screen.getByRole('button');
    fireEvent.click(button);

    // After clicking, theme should be dark
    expect(localStorage.getItem('ham-exam-theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('should initialize with stored dark theme', async () => {
    localStorage.setItem('ham-exam-theme', 'dark');

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

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });
  });

  it('should initialize with stored light theme', async () => {
    localStorage.setItem('ham-exam-theme', 'light');

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

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });
  });

  it('should have proper accessibility attributes', async () => {
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

    render(<ThemeToggle />);

    const button = screen.getByRole('button');

    // Should have aria-label
    await waitFor(() => {
      expect(button).toHaveAttribute('aria-label');
    });
  });

  it('should apply hover and focus styles through className', () => {
    render(<ThemeToggle />);
    const button = screen.getByRole('button');

    // Check that the button has the expected classes
    expect(button).toHaveClass('p-2');
    expect(button).toHaveClass('rounded-full');
    expect(button).toHaveClass('hover:bg-muted');
    expect(button).toHaveClass('transition-all');
  });
});

import { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  type Theme,
  getStoredTheme,
  setStoredTheme,
  applyTheme,
  initTheme,
} from '@/lib/theme';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const [_theme, setTheme] = useState<Theme>('system');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initialTheme = initTheme();
    setTheme(initialTheme);
    setMounted(true);
  }, []);

  const toggleTheme = () => {
    const currentTheme = getStoredTheme();
    let newTheme: Theme;

    if (currentTheme === 'system') {
      // If system, switch to explicit opposite of current system preference
      const isDark = document.documentElement.classList.contains('dark');
      newTheme = isDark ? 'light' : 'dark';
    } else if (currentTheme === 'dark') {
      newTheme = 'light';
    } else {
      newTheme = 'dark';
    }

    setStoredTheme(newTheme);
    applyTheme(newTheme);
    setTheme(newTheme);
  };

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <button
        className={cn(
          'p-2 rounded-full bg-muted/50 hover:bg-muted transition-colors',
          className
        )}
        aria-label="Toggle theme"
      >
        <div className="w-5 h-5" />
      </button>
    );
  }

  const isDark = document.documentElement.classList.contains('dark');

  return (
    <button
      onClick={toggleTheme}
      className={cn(
        'p-2 rounded-full bg-muted/50 hover:bg-muted transition-all duration-200',
        'hover:scale-105 active:scale-95',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
        className
      )}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? (
        <Sun className="w-5 h-5 text-yellow-500 transition-transform duration-200" />
      ) : (
        <Moon className="w-5 h-5 text-slate-700 transition-transform duration-200" />
      )}
    </button>
  );
}

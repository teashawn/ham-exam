import { useEffect, useCallback, useRef } from 'react';
import type { AppView } from '../types';

// Get the base path from Vite config (e.g., '/ham-exam/' in production, '/' in dev)
/* c8 ignore next - defensive fallback, BASE_URL always provided by Vite */
const BASE_PATH = import.meta.env.BASE_URL || '/';

export interface UrlState {
  view: AppView;
  questionIndex?: number;
  sectionNumber?: number;
  fsrsMode?: boolean;
}

/**
 * Maps URL paths to AppView
 */
const pathToView: Record<string, AppView> = {
  '/': 'login',
  '/login': 'login',
  '/mode-select': 'mode-select',
  '/exam-home': 'exam-home',
  '/study-home': 'study-home',
  '/config': 'config',
  '/exam': 'exam',
  '/study': 'study',
  '/results': 'results',
  '/history': 'history',
};

/**
 * Maps AppView to URL path
 */
const viewToPath: Record<AppView, string> = {
  'login': '/',
  'mode-select': '/mode-select',
  'exam-home': '/exam-home',
  'study-home': '/study-home',
  'config': '/config',
  'exam': '/exam',
  'study': '/study',
  'results': '/results',
  'history': '/history',
};

/**
 * Parse the current URL into app state
 */
export function parseUrl(): UrlState {
  let path = window.location.pathname;
  const params = new URLSearchParams(window.location.search);

  // Strip base path prefix (e.g., '/ham-exam' from '/ham-exam/study')
  const baseWithoutTrailing = BASE_PATH.replace(/\/$/, '');
  if (baseWithoutTrailing && path.startsWith(baseWithoutTrailing)) {
    path = path.slice(baseWithoutTrailing.length) || '/';
  }

  const view = pathToView[path] ?? 'login';

  const result: UrlState = { view };

  // Parse question index from 'q' param (1-based in URL, 0-based internally)
  const qParam = params.get('q');
  if (qParam) {
    const q = parseInt(qParam, 10);
    if (!isNaN(q) && q >= 1) {
      result.questionIndex = q - 1; // Convert to 0-based
    }
  }

  // Parse section number from 'section' param
  const sectionParam = params.get('section');
  if (sectionParam) {
    const section = parseInt(sectionParam, 10);
    if (!isNaN(section) && section >= 1 && section <= 3) {
      result.sectionNumber = section;
    }
  }

  // Parse FSRS mode
  const fsrsParam = params.get('fsrs');
  if (fsrsParam === '1' || fsrsParam === 'true') {
    result.fsrsMode = true;
  }

  return result;
}

/**
 * Build a URL from app state
 */
export function buildUrl(state: UrlState): string {
  /* c8 ignore next - fallback for unknown view types */
  const viewPath = viewToPath[state.view] ?? '/';
  const params = new URLSearchParams();

  // Add question index (convert to 1-based for URL)
  if (state.questionIndex !== undefined && state.questionIndex >= 0) {
    params.set('q', String(state.questionIndex + 1));
  }

  // Add section number
  if (state.sectionNumber !== undefined) {
    params.set('section', String(state.sectionNumber));
  }

  // Add FSRS mode
  if (state.fsrsMode) {
    params.set('fsrs', '1');
  }

  // Combine base path with view path (avoiding double slashes)
  const baseWithoutTrailing = BASE_PATH.replace(/\/$/, '');
  const path = viewPath === '/' ? BASE_PATH : `${baseWithoutTrailing}${viewPath}`;

  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

interface UseUrlNavigationOptions {
  view: AppView;
  questionIndex: number;
  sectionNumber?: number;
  fsrsMode: boolean;
  onUrlChange: (state: UrlState) => void;
}

/**
 * Custom hook for URL-based navigation
 * - Updates URL when state changes
 * - Handles browser back/forward buttons
 * - Provides initial state from URL
 */
export function useUrlNavigation({
  view,
  questionIndex,
  sectionNumber,
  fsrsMode,
  onUrlChange,
}: UseUrlNavigationOptions) {
  const isInitialMount = useRef(true);
  const lastUrl = useRef<string>('');

  // Update URL when state changes
  useEffect(() => {
    // Skip initial mount - we want to read from URL first
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    const state: UrlState = { view };

    // Only include question index for views that use it
    if (view === 'exam' || view === 'study') {
      state.questionIndex = questionIndex;
    }

    // Only include section for study mode
    if (view === 'study' && sectionNumber !== undefined) {
      state.sectionNumber = sectionNumber;
    }

    // Include FSRS mode
    if (view === 'study' && fsrsMode) {
      state.fsrsMode = true;
    }

    const newUrl = buildUrl(state);

    // Only update if URL actually changed
    if (newUrl !== lastUrl.current) {
      lastUrl.current = newUrl;
      window.history.pushState(state, '', newUrl);
    }
  }, [view, questionIndex, sectionNumber, fsrsMode]);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const state = parseUrl();
      lastUrl.current = buildUrl(state);
      onUrlChange(state);
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [onUrlChange]);

  // Get initial state from URL (called once on mount)
  const getInitialState = useCallback((): UrlState => {
    const state = parseUrl();
    lastUrl.current = buildUrl(state);
    return state;
  }, []);

  return { getInitialState };
}

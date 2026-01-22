/**
 * useSRS Hook - React hook for FSRS spaced repetition
 *
 * Provides state management and operations for FSRS-based study mode.
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import type {
  FSRSCard,
  FSRSConfig,
  FSRSStats,
  FSRSRating,
  ExamQuestion,
  SchedulingPreview,
} from '@ham-exam/exam-core';
import {
  CardState,
  calculateReview,
  createReviewLog,
  examResultToRating,
  getSchedulingPreview as getSchedulingPreviewFn,
  sortCardsByUrgency,
  DEFAULT_FSRS_CONFIG,
} from '@ham-exam/exam-core';
import {
  getDatabase,
  getOrCreateCard,
  updateCard,
  addReviewLog,
  getCardsForProfile,
  getFSRSConfig,
  saveFSRSConfig,
  migrateFromLocalStorage,
  exportProfileData,
  importProfileData,
  clearProfileData,
  type FSRSDatabase,
} from '@/lib/db';

export interface UseSRSOptions {
  profileId: string;
  questions: ExamQuestion[];
  onMigrationComplete?: (count: number) => void;
}

export interface UseSRSReturn {
  /** Whether the hook is still loading data */
  isLoading: boolean;
  /** Current FSRS configuration */
  config: FSRSConfig;
  /** All cards for the current profile */
  allCards: FSRSCard[];
  /** Cards that are due for review now */
  dueCards: FSRSCard[];
  /** Statistics about card states */
  stats: FSRSStats;
  /** Review a card with a specific rating (for study mode) */
  reviewCard: (questionId: string, rating: FSRSRating) => Promise<FSRSCard>;
  /** Review from exam mode (binary correct/incorrect) */
  reviewFromExam: (questionId: string, isCorrect: boolean) => Promise<void>;
  /** Get the next due card (sorted by urgency) */
  getNextDueCard: () => FSRSCard | null;
  /** Get scheduling preview for a card */
  getSchedulePreview: (questionId: string) => Promise<SchedulingPreview | null>;
  /** Update FSRS configuration */
  updateConfig: (config: Partial<FSRSConfig>) => Promise<void>;
  /** Migrate existing study progress to FSRS */
  migrateProgress: (viewedQuestionIds: string[]) => Promise<number>;
  /** Export all profile data for backup */
  exportData: () => Promise<{
    cards: FSRSCard[];
    reviewLogs: { id: string; profileId: string; questionId: string; rating: FSRSRating; reviewedAt: string; source: 'study' | 'exam' }[];
    config: FSRSConfig;
  }>;
  /** Import profile data from backup */
  importData: (data: {
    cards: FSRSCard[];
    reviewLogs: { id: string; profileId: string; questionId: string; rating: FSRSRating; reviewedAt: string; source: 'study' | 'exam' }[];
    config: FSRSConfig;
  }) => Promise<void>;
  /** Clear all FSRS data for the profile */
  clearData: () => Promise<void>;
  /** Initialize cards for all questions (lazy creation) */
  initializeCards: () => Promise<void>;
  /** Get or create a card for a specific question */
  getCard: (questionId: string) => Promise<FSRSCard>;
}

/**
 * Calculate statistics from cards
 * Exported for testing
 */
export function calculateStats(cards: FSRSCard[], now: Date): FSRSStats {
  const stats: FSRSStats = {
    totalCards: cards.length,
    newCards: 0,
    learningCards: 0,
    reviewCards: 0,
    relearningCards: 0,
    dueNow: 0,
  };

  const nowTime = now.getTime();

  for (const card of cards) {
    switch (card.state) {
      case CardState.New:
        stats.newCards++;
        break;
      case CardState.Learning:
        stats.learningCards++;
        break;
      case CardState.Review:
        stats.reviewCards++;
        break;
      case CardState.Relearning:
        stats.relearningCards++;
        break;
    }

    if (new Date(card.due).getTime() <= nowTime) {
      stats.dueNow++;
    }
  }

  return stats;
}

/**
 * React hook for FSRS spaced repetition management
 */
export function useSRS({ profileId, questions }: UseSRSOptions): UseSRSReturn {
  const [db] = useState<FSRSDatabase>(() => getDatabase());
  const [config, setConfig] = useState<FSRSConfig>(DEFAULT_FSRS_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  // Use Dexie's live query for reactive card updates
  const allCards = useLiveQuery(
    () => getCardsForProfile(db, profileId),
    [profileId],
    []
  );

  // Calculate due cards and stats
  const now = useMemo(() => new Date(), []);

  const dueCards = useMemo(() => {
    /* c8 ignore next */
    if (!allCards) return [];
    const due = allCards.filter(
      (card) => new Date(card.due).getTime() <= now.getTime()
    );
    return sortCardsByUrgency(due, now);
  }, [allCards, now]);

  const stats = useMemo(() => {
    // Handle initial state before async query resolves
    /* c8 ignore start */
    if (!allCards) {
      return {
        totalCards: 0,
        newCards: 0,
        learningCards: 0,
        reviewCards: 0,
        relearningCards: 0,
        dueNow: 0,
      };
    }
    /* c8 ignore stop */
    return calculateStats(allCards, now);
  }, [allCards, now]);

  // Load config on mount
  useEffect(() => {
    async function loadConfig() {
      const savedConfig = await getFSRSConfig(db, profileId);
      setConfig(savedConfig);
      setIsLoading(false);
    }
    loadConfig();
  }, [db, profileId]);

  // Get or create card for a question
  const getCard = useCallback(
    async (questionId: string): Promise<FSRSCard> => {
      return getOrCreateCard(db, profileId, questionId);
    },
    [db, profileId]
  );

  // Review a card with a specific rating
  const reviewCard = useCallback(
    async (questionId: string, rating: FSRSRating): Promise<FSRSCard> => {
      const card = await getOrCreateCard(db, profileId, questionId);
      const now = new Date();
      const updatedCard = calculateReview(card, rating, config, now);

      await updateCard(db, updatedCard);

      const log = createReviewLog(profileId, questionId, rating, 'study', now);
      await addReviewLog(db, log);

      return updatedCard;
    },
    [db, profileId, config]
  );

  // Review from exam mode (binary correct/incorrect)
  const reviewFromExam = useCallback(
    async (questionId: string, isCorrect: boolean): Promise<void> => {
      const rating = examResultToRating(isCorrect);
      const card = await getOrCreateCard(db, profileId, questionId);
      const now = new Date();
      const updatedCard = calculateReview(card, rating, config, now);

      await updateCard(db, updatedCard);

      const log = createReviewLog(profileId, questionId, rating, 'exam', now);
      await addReviewLog(db, log);
    },
    [db, profileId, config]
  );

  // Get next due card
  const getNextDueCard = useCallback((): FSRSCard | null => {
    /* c8 ignore next 2 */
    if (dueCards.length === 0) return null;
    return dueCards[0];
  }, [dueCards]);

  // Get scheduling preview for a card
  const getSchedulePreview = useCallback(
    async (questionId: string): Promise<SchedulingPreview | null> => {
      const card = await getOrCreateCard(db, profileId, questionId);
      return getSchedulingPreviewFn(card, config);
    },
    [db, profileId, config]
  );

  // Update config
  const updateConfig = useCallback(
    async (updates: Partial<FSRSConfig>): Promise<void> => {
      const newConfig = { ...config, ...updates };
      await saveFSRSConfig(db, profileId, newConfig);
      setConfig(newConfig);
    },
    [db, profileId, config]
  );

  // Migrate existing study progress
  const migrateProgress = useCallback(
    async (viewedQuestionIds: string[]): Promise<number> => {
      return migrateFromLocalStorage(db, profileId, viewedQuestionIds);
    },
    [db, profileId]
  );

  // Export data
  const exportData = useCallback(async () => {
    return exportProfileData(db, profileId);
  }, [db, profileId]);

  // Import data
  const importData = useCallback(
    async (data: {
      cards: FSRSCard[];
      reviewLogs: { id: string; profileId: string; questionId: string; rating: FSRSRating; reviewedAt: string; source: 'study' | 'exam' }[];
      config: FSRSConfig;
    }): Promise<void> => {
      await importProfileData(db, profileId, data);
      setConfig(data.config);
    },
    [db, profileId]
  );

  // Clear data
  const clearData = useCallback(async (): Promise<void> => {
    await clearProfileData(db, profileId);
    setConfig(DEFAULT_FSRS_CONFIG);
  }, [db, profileId]);

  // Initialize cards for all questions
  const initializeCards = useCallback(async (): Promise<void> => {
    const now = new Date();
    for (const question of questions) {
      await getOrCreateCard(db, profileId, question.id, now);
    }
  }, [db, profileId, questions]);

  return {
    isLoading,
    config,
    /* c8 ignore next */
    allCards: allCards ?? [],
    dueCards,
    stats,
    reviewCard,
    reviewFromExam,
    getNextDueCard,
    getSchedulePreview,
    updateConfig,
    migrateProgress,
    exportData,
    importData,
    clearData,
    initializeCards,
    getCard,
  };
}

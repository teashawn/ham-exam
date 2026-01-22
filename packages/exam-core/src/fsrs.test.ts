import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  calculateReview,
  createExamPrepConfig,
  createNewCard,
  createReviewLog,
  examResultToRating,
  formatInterval,
  getDaysUntilExam,
  getDueCards,
  getSchedulingPreview,
  isCardDue,
  sortCardsByUrgency,
} from './fsrs.js';
import {
  CardState,
  FSRSCard,
  FSRSConfig,
  FSRSRating,
  DEFAULT_FSRS_CONFIG,
} from './types.js';

// Helper to create a test card
function createTestCard(
  overrides: Partial<FSRSCard> = {},
  now: Date = new Date()
): FSRSCard {
  return {
    id: 'profile1_q1',
    profileId: 'profile1',
    questionId: 'q1',
    state: CardState.New,
    due: now.toISOString(),
    stability: 0,
    difficulty: 0,
    elapsedDays: 0,
    scheduledDays: 0,
    reps: 0,
    lapses: 0,
    lastReview: null,
    ...overrides,
  };
}

describe('createNewCard', () => {
  it('should create a new card with correct properties', () => {
    const now = new Date('2024-01-15T12:00:00.000Z');
    const card = createNewCard('profile1', 'question1', now);

    expect(card.id).toBe('profile1_question1');
    expect(card.profileId).toBe('profile1');
    expect(card.questionId).toBe('question1');
    expect(card.state).toBe(CardState.New);
    expect(card.due).toBe(now.toISOString());
    expect(card.stability).toBe(0);
    expect(card.difficulty).toBe(0);
    expect(card.reps).toBe(0);
    expect(card.lapses).toBe(0);
    expect(card.lastReview).toBeNull();
  });

  it('should use current date if not provided', () => {
    const before = new Date();
    const card = createNewCard('p1', 'q1');
    const after = new Date();

    const cardDue = new Date(card.due);
    expect(cardDue.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(cardDue.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

describe('calculateReview', () => {
  const now = new Date('2024-01-15T12:00:00.000Z');

  it('should update card state after rating Again', () => {
    const card = createNewCard('p1', 'q1', now);
    const reviewed = calculateReview(card, FSRSRating.Again, DEFAULT_FSRS_CONFIG, now);

    expect(reviewed.state).toBe(CardState.Learning);
    expect(reviewed.lapses).toBe(0);
    expect(reviewed.reps).toBe(1);
    expect(reviewed.lastReview).toBe(now.toISOString());
  });

  it('should update card state after rating Hard', () => {
    const card = createNewCard('p1', 'q1', now);
    const reviewed = calculateReview(card, FSRSRating.Hard, DEFAULT_FSRS_CONFIG, now);

    expect(reviewed.state).toBe(CardState.Learning);
    expect(reviewed.reps).toBe(1);
    expect(reviewed.lastReview).toBe(now.toISOString());
  });

  it('should update card state after rating Good', () => {
    const card = createNewCard('p1', 'q1', now);
    const reviewed = calculateReview(card, FSRSRating.Good, DEFAULT_FSRS_CONFIG, now);

    expect(reviewed.reps).toBe(1);
    expect(reviewed.lastReview).toBe(now.toISOString());
    // Due date should be in the future
    expect(new Date(reviewed.due).getTime()).toBeGreaterThanOrEqual(now.getTime());
  });

  it('should update card state after rating Easy', () => {
    const card = createNewCard('p1', 'q1', now);
    const reviewed = calculateReview(card, FSRSRating.Easy, DEFAULT_FSRS_CONFIG, now);

    expect(reviewed.state).toBe(CardState.Review);
    expect(reviewed.reps).toBe(1);
    expect(reviewed.lastReview).toBe(now.toISOString());
    // Due date should be further in the future for Easy
    expect(new Date(reviewed.due).getTime()).toBeGreaterThan(now.getTime());
  });

  it('should cap due date at exam date when configured', () => {
    const examDate = '2024-01-20T00:00:00.000Z';
    const config: FSRSConfig = {
      ...DEFAULT_FSRS_CONFIG,
      examDate,
    };

    const card = createNewCard('p1', 'q1', now);
    const reviewed = calculateReview(card, FSRSRating.Easy, config, now);

    // Due date should not exceed exam date
    expect(new Date(reviewed.due).getTime()).toBeLessThanOrEqual(
      new Date(examDate).getTime()
    );
  });

  it('should handle reviewed cards (with previous reviews)', () => {
    const previousReview = new Date('2024-01-14T12:00:00.000Z');
    const card = createTestCard({
      state: CardState.Review,
      reps: 3,
      stability: 5,
      difficulty: 5,
      lastReview: previousReview.toISOString(),
    }, now);

    const reviewed = calculateReview(card, FSRSRating.Good, DEFAULT_FSRS_CONFIG, now);

    expect(reviewed.reps).toBe(4);
    expect(reviewed.lastReview).toBe(now.toISOString());
  });

  it('should use default config if not provided', () => {
    const card = createNewCard('p1', 'q1', now);
    const reviewed = calculateReview(card, FSRSRating.Good);

    expect(reviewed.reps).toBe(1);
  });

  it('should handle relearning state after lapse', () => {
    const card = createTestCard({
      state: CardState.Review,
      reps: 5,
      stability: 10,
      difficulty: 5,
      lapses: 0,
    }, now);

    const reviewed = calculateReview(card, FSRSRating.Again, DEFAULT_FSRS_CONFIG, now);

    // After Again on Review card, should go to Relearning
    expect(reviewed.state).toBe(CardState.Relearning);
    expect(reviewed.lapses).toBe(1);
  });

  it('should handle Learning state cards', () => {
    const card = createTestCard({
      state: CardState.Learning,
      reps: 1,
      stability: 0.5,
      difficulty: 5,
    }, now);

    const reviewed = calculateReview(card, FSRSRating.Good, DEFAULT_FSRS_CONFIG, now);

    expect(reviewed.reps).toBe(2);
    expect(reviewed.lastReview).toBe(now.toISOString());
  });

  it('should handle Relearning state cards', () => {
    const card = createTestCard({
      state: CardState.Relearning,
      reps: 3,
      stability: 2,
      difficulty: 6,
      lapses: 1,
    }, now);

    const reviewed = calculateReview(card, FSRSRating.Good, DEFAULT_FSRS_CONFIG, now);

    expect(reviewed.reps).toBe(4);
    expect(reviewed.lastReview).toBe(now.toISOString());
  });

  it('should cap due date and recalculate scheduledDays when beyond exam date', () => {
    // Use a very close exam date so Easy rating would normally exceed it
    const examDate = '2024-01-16T00:00:00.000Z'; // 12 hours from now
    const config: FSRSConfig = {
      ...DEFAULT_FSRS_CONFIG,
      examDate,
      maximumInterval: 30, // Allow long interval so FSRS would schedule beyond exam
    };

    // Use a well-reviewed card that would get a long interval
    const card = createTestCard({
      state: CardState.Review,
      reps: 10,
      stability: 30, // High stability means long intervals
      difficulty: 4,
      lastReview: new Date('2024-01-10T12:00:00.000Z').toISOString(),
    }, now);

    const reviewed = calculateReview(card, FSRSRating.Easy, config, now);

    // Due date should be capped at exam date
    expect(new Date(reviewed.due).getTime()).toBeLessThanOrEqual(
      new Date(examDate).getTime()
    );
    // scheduledDays should be recalculated
    expect(reviewed.scheduledDays).toBeLessThanOrEqual(1); // At most 1 day until exam
  });
});

describe('examResultToRating', () => {
  it('should return Good for correct answers', () => {
    expect(examResultToRating(true)).toBe(FSRSRating.Good);
  });

  it('should return Again for incorrect answers', () => {
    expect(examResultToRating(false)).toBe(FSRSRating.Again);
  });
});

describe('getSchedulingPreview', () => {
  const now = new Date('2024-01-15T12:00:00.000Z');

  it('should return preview for all ratings', () => {
    const card = createNewCard('p1', 'q1', now);
    const preview = getSchedulingPreview(card, DEFAULT_FSRS_CONFIG, now);

    expect(preview[FSRSRating.Again]).toBeDefined();
    expect(preview[FSRSRating.Hard]).toBeDefined();
    expect(preview[FSRSRating.Good]).toBeDefined();
    expect(preview[FSRSRating.Easy]).toBeDefined();

    // Each preview should have due and interval
    expect(preview[FSRSRating.Again].due).toBeDefined();
    expect(preview[FSRSRating.Again].interval).toBeDefined();
    expect(preview[FSRSRating.Hard].due).toBeDefined();
    expect(preview[FSRSRating.Hard].interval).toBeDefined();
    expect(preview[FSRSRating.Good].due).toBeDefined();
    expect(preview[FSRSRating.Good].interval).toBeDefined();
    expect(preview[FSRSRating.Easy].due).toBeDefined();
    expect(preview[FSRSRating.Easy].interval).toBeDefined();
  });

  it('should show increasing intervals for higher ratings', () => {
    const card = createNewCard('p1', 'q1', now);
    const preview = getSchedulingPreview(card, DEFAULT_FSRS_CONFIG, now);

    // For a new card, Easy should have a longer interval than Again
    expect(
      new Date(preview[FSRSRating.Easy].due).getTime()
    ).toBeGreaterThan(
      new Date(preview[FSRSRating.Again].due).getTime()
    );
  });

  it('should cap preview intervals at exam date', () => {
    const examDate = '2024-01-17T00:00:00.000Z';
    const config: FSRSConfig = {
      ...DEFAULT_FSRS_CONFIG,
      examDate,
    };

    const card = createNewCard('p1', 'q1', now);
    const preview = getSchedulingPreview(card, config, now);

    // All due dates should not exceed exam date
    expect(
      new Date(preview[FSRSRating.Again].due).getTime()
    ).toBeLessThanOrEqual(new Date(examDate).getTime());
    expect(
      new Date(preview[FSRSRating.Hard].due).getTime()
    ).toBeLessThanOrEqual(new Date(examDate).getTime());
    expect(
      new Date(preview[FSRSRating.Good].due).getTime()
    ).toBeLessThanOrEqual(new Date(examDate).getTime());
    expect(
      new Date(preview[FSRSRating.Easy].due).getTime()
    ).toBeLessThanOrEqual(new Date(examDate).getTime());
  });
});

describe('sortCardsByUrgency', () => {
  const now = new Date('2024-01-15T12:00:00.000Z');

  it('should sort overdue cards first (most overdue first)', () => {
    const card1 = createTestCard({ id: 'c1', due: '2024-01-14T00:00:00.000Z' }); // 1 day overdue
    const card2 = createTestCard({ id: 'c2', due: '2024-01-13T00:00:00.000Z' }); // 2 days overdue
    const card3 = createTestCard({ id: 'c3', due: '2024-01-16T00:00:00.000Z' }); // future

    const sorted = sortCardsByUrgency([card1, card3, card2], now);

    expect(sorted[0].id).toBe('c2'); // most overdue
    expect(sorted[1].id).toBe('c1'); // less overdue
    expect(sorted[2].id).toBe('c3'); // future
  });

  it('should sort future cards by soonest due first', () => {
    const card1 = createTestCard({ id: 'c1', due: '2024-01-17T00:00:00.000Z' }); // 2 days
    const card2 = createTestCard({ id: 'c2', due: '2024-01-16T00:00:00.000Z' }); // 1 day
    const card3 = createTestCard({ id: 'c3', due: '2024-01-20T00:00:00.000Z' }); // 5 days

    const sorted = sortCardsByUrgency([card1, card3, card2], now);

    expect(sorted[0].id).toBe('c2');
    expect(sorted[1].id).toBe('c1');
    expect(sorted[2].id).toBe('c3');
  });

  it('should place overdue cards before future cards', () => {
    const overdueCard = createTestCard({ id: 'overdue', due: '2024-01-14T00:00:00.000Z' });
    const futureCard = createTestCard({ id: 'future', due: '2024-01-16T00:00:00.000Z' });

    const sorted = sortCardsByUrgency([futureCard, overdueCard], now);

    expect(sorted[0].id).toBe('overdue');
    expect(sorted[1].id).toBe('future');
  });

  it('should handle empty array', () => {
    const sorted = sortCardsByUrgency([], now);
    expect(sorted).toEqual([]);
  });

  it('should not modify original array', () => {
    const card1 = createTestCard({ id: 'c1', due: '2024-01-17T00:00:00.000Z' });
    const card2 = createTestCard({ id: 'c2', due: '2024-01-16T00:00:00.000Z' });
    const original = [card1, card2];

    sortCardsByUrgency(original, now);

    expect(original[0].id).toBe('c1');
    expect(original[1].id).toBe('c2');
  });
});

describe('getDueCards', () => {
  const now = new Date('2024-01-15T12:00:00.000Z');

  it('should return only due cards', () => {
    const dueCard1 = createTestCard({ id: 'due1', due: '2024-01-14T00:00:00.000Z' });
    const dueCard2 = createTestCard({ id: 'due2', due: '2024-01-15T12:00:00.000Z' }); // exactly now
    const futureCard = createTestCard({ id: 'future', due: '2024-01-16T00:00:00.000Z' });

    const dueCards = getDueCards([dueCard1, dueCard2, futureCard], now);

    expect(dueCards.length).toBe(2);
    expect(dueCards.map(c => c.id)).toContain('due1');
    expect(dueCards.map(c => c.id)).toContain('due2');
    expect(dueCards.map(c => c.id)).not.toContain('future');
  });

  it('should return empty array if no cards are due', () => {
    const futureCard = createTestCard({ id: 'future', due: '2024-01-16T00:00:00.000Z' });

    const dueCards = getDueCards([futureCard], now);

    expect(dueCards).toEqual([]);
  });

  it('should handle empty array', () => {
    const dueCards = getDueCards([], now);
    expect(dueCards).toEqual([]);
  });
});

describe('isCardDue', () => {
  const now = new Date('2024-01-15T12:00:00.000Z');

  it('should return true for overdue cards', () => {
    const card = createTestCard({ due: '2024-01-14T00:00:00.000Z' });
    expect(isCardDue(card, now)).toBe(true);
  });

  it('should return true for cards due exactly now', () => {
    const card = createTestCard({ due: now.toISOString() });
    expect(isCardDue(card, now)).toBe(true);
  });

  it('should return false for future cards', () => {
    const card = createTestCard({ due: '2024-01-16T00:00:00.000Z' });
    expect(isCardDue(card, now)).toBe(false);
  });
});

describe('getDaysUntilExam', () => {
  const now = new Date('2024-01-15T00:00:00.000Z');

  it('should calculate correct days until exam', () => {
    expect(getDaysUntilExam('2024-01-22T00:00:00.000Z', now)).toBe(7);
    expect(getDaysUntilExam('2024-01-16T00:00:00.000Z', now)).toBe(1);
    expect(getDaysUntilExam('2024-01-15T12:00:00.000Z', now)).toBe(1); // partial day rounds up
  });

  it('should return 0 if exam date is in the past', () => {
    expect(getDaysUntilExam('2024-01-14T00:00:00.000Z', now)).toBe(0);
    expect(getDaysUntilExam('2024-01-01T00:00:00.000Z', now)).toBe(0);
  });

  it('should return 0 if exam date is today', () => {
    expect(getDaysUntilExam('2024-01-15T00:00:00.000Z', now)).toBe(0);
  });
});

describe('createExamPrepConfig', () => {
  const now = new Date('2024-01-15T00:00:00.000Z');

  it('should create config with correct exam date', () => {
    const examDate = '2024-01-22T00:00:00.000Z';
    const config = createExamPrepConfig(examDate, now);

    expect(config.examDate).toBe(examDate);
    expect(config.maximumInterval).toBe(7);
    expect(config.requestRetention).toBe(0.95);
    expect(config.enableFuzz).toBe(false);
    expect(config.enableShortTerm).toBe(true);
  });

  it('should set minimum interval of 1 day', () => {
    const examDate = '2024-01-15T00:00:00.000Z'; // same day
    const config = createExamPrepConfig(examDate, now);

    expect(config.maximumInterval).toBe(1);
  });

  it('should handle exam date in the past', () => {
    const examDate = '2024-01-14T00:00:00.000Z';
    const config = createExamPrepConfig(examDate, now);

    expect(config.maximumInterval).toBe(1); // minimum of 1
  });
});

describe('createReviewLog', () => {
  const now = new Date('2024-01-15T12:00:00.000Z');

  it('should create review log with correct properties for study', () => {
    const log = createReviewLog('profile1', 'question1', FSRSRating.Good, 'study', now);

    expect(log.id).toBeTruthy();
    expect(log.profileId).toBe('profile1');
    expect(log.questionId).toBe('question1');
    expect(log.rating).toBe(FSRSRating.Good);
    expect(log.reviewedAt).toBe(now.toISOString());
    expect(log.source).toBe('study');
  });

  it('should create review log for exam source', () => {
    const log = createReviewLog('p1', 'q1', FSRSRating.Again, 'exam', now);

    expect(log.source).toBe('exam');
    expect(log.rating).toBe(FSRSRating.Again);
  });

  it('should generate unique IDs', () => {
    const log1 = createReviewLog('p1', 'q1', FSRSRating.Good, 'study', now);
    const log2 = createReviewLog('p1', 'q1', FSRSRating.Good, 'study', now);

    expect(log1.id).not.toBe(log2.id);
  });

  it('should use current date if not provided', () => {
    const before = new Date();
    const log = createReviewLog('p1', 'q1', FSRSRating.Good, 'study');
    const after = new Date();

    const logDate = new Date(log.reviewedAt);
    expect(logDate.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(logDate.getTime()).toBeLessThanOrEqual(after.getTime());
  });
});

describe('formatInterval', () => {
  it('should format negative intervals as "now"', () => {
    expect(formatInterval(-1)).toBe('now');
    expect(formatInterval(-0.5)).toBe('now');
  });

  it('should format very small intervals as "<1m"', () => {
    expect(formatInterval(0)).toBe('<1m');
    expect(formatInterval(1 / (24 * 60 * 2))).toBe('<1m'); // 30 seconds
  });

  it('should format minutes correctly', () => {
    expect(formatInterval(1 / (24 * 60) * 5)).toBe('5m'); // 5 minutes
    expect(formatInterval(1 / (24 * 60) * 30)).toBe('30m'); // 30 minutes
    expect(formatInterval(1 / (24 * 60) * 59)).toBe('59m'); // 59 minutes
  });

  it('should format hours correctly', () => {
    expect(formatInterval(1 / 24)).toBe('1h'); // 1 hour
    expect(formatInterval(1 / 24 * 4)).toBe('4h'); // 4 hours
    expect(formatInterval(1 / 24 * 23)).toBe('23h'); // 23 hours
  });

  it('should format days correctly', () => {
    expect(formatInterval(1)).toBe('1d');
    expect(formatInterval(3)).toBe('3d');
    expect(formatInterval(7)).toBe('7d');
    expect(formatInterval(30)).toBe('30d');
  });

  it('should round fractional days', () => {
    expect(formatInterval(1.4)).toBe('1d');
    expect(formatInterval(1.6)).toBe('2d');
    expect(formatInterval(3.5)).toBe('4d');
  });
});

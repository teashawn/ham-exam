/**
 * FSRS (Free Spaced Repetition Scheduler) Service
 *
 * Platform-agnostic wrapper around ts-fsrs for exam preparation.
 * Optimized for 7-day intensive learning windows.
 */

import {
  FSRS,
  Card as TsFsrsCard,
  Rating,
  Grade,
  createEmptyCard,
  generatorParameters,
  State,
} from 'ts-fsrs';
import {
  CardState,
  FSRSCard,
  FSRSConfig,
  FSRSRating,
  SchedulingPreview,
  DEFAULT_FSRS_CONFIG,
} from './types.js';
import { generateId } from './engine.js';

/**
 * Map ts-fsrs State to our CardState
 */
function mapState(state: State): CardState {
  switch (state) {
    case State.New:
      return CardState.New;
    case State.Learning:
      return CardState.Learning;
    case State.Review:
      return CardState.Review;
    case State.Relearning:
      return CardState.Relearning;
  }
}

/**
 * Map our CardState to ts-fsrs State
 */
function mapToTsFsrsState(state: CardState): State {
  switch (state) {
    case CardState.New:
      return State.New;
    case CardState.Learning:
      return State.Learning;
    case CardState.Review:
      return State.Review;
    case CardState.Relearning:
      return State.Relearning;
  }
}

/**
 * Map FSRSRating to ts-fsrs Grade (Rating excluding Manual)
 */
function mapRating(rating: FSRSRating): Grade {
  switch (rating) {
    case FSRSRating.Again:
      return Rating.Again;
    case FSRSRating.Hard:
      return Rating.Hard;
    case FSRSRating.Good:
      return Rating.Good;
    case FSRSRating.Easy:
      return Rating.Easy;
  }
}

/**
 * Create FSRS instance with the given config
 */
function createFSRSInstance(config: FSRSConfig = DEFAULT_FSRS_CONFIG): FSRS {
  const params = generatorParameters({
    request_retention: config.requestRetention,
    maximum_interval: config.maximumInterval,
    enable_fuzz: config.enableFuzz,
    enable_short_term: config.enableShortTerm,
  });
  return new FSRS(params);
}

/**
 * Convert our FSRSCard to ts-fsrs Card
 */
function toTsFsrsCard(card: FSRSCard): TsFsrsCard {
  return {
    due: new Date(card.due),
    stability: card.stability,
    difficulty: card.difficulty,
    elapsed_days: card.elapsedDays,
    scheduled_days: card.scheduledDays,
    learning_steps: 0,
    reps: card.reps,
    lapses: card.lapses,
    state: mapToTsFsrsState(card.state),
    last_review: card.lastReview ? new Date(card.lastReview) : undefined,
  };
}

/**
 * Convert ts-fsrs Card to our FSRSCard
 */
function fromTsFsrsCard(
  tsFsrsCard: TsFsrsCard,
  profileId: string,
  questionId: string
): FSRSCard {
  return {
    id: `${profileId}_${questionId}`,
    profileId,
    questionId,
    state: mapState(tsFsrsCard.state),
    due: tsFsrsCard.due.toISOString(),
    stability: tsFsrsCard.stability,
    difficulty: tsFsrsCard.difficulty,
    elapsedDays: tsFsrsCard.elapsed_days,
    scheduledDays: tsFsrsCard.scheduled_days,
    reps: tsFsrsCard.reps,
    lapses: tsFsrsCard.lapses,
    lastReview: tsFsrsCard.last_review
      ? tsFsrsCard.last_review.toISOString()
      : null,
  };
}

/**
 * Create a new FSRS card for a question
 */
export function createNewCard(
  profileId: string,
  questionId: string,
  now: Date = new Date()
): FSRSCard {
  const emptyCard = createEmptyCard(now);
  return fromTsFsrsCard(emptyCard, profileId, questionId);
}

/**
 * Calculate the next review state for a card after a user rates it
 */
export function calculateReview(
  card: FSRSCard,
  rating: FSRSRating,
  config: FSRSConfig = DEFAULT_FSRS_CONFIG,
  now: Date = new Date()
): FSRSCard {
  const fsrs = createFSRSInstance(config);
  const tsFsrsCard = toTsFsrsCard(card);
  const tsFsrsRating = mapRating(rating);

  const schedulingCards = fsrs.repeat(tsFsrsCard, now);
  const newTsFsrsCard = schedulingCards[tsFsrsRating].card;

  let updatedCard = fromTsFsrsCard(newTsFsrsCard, card.profileId, card.questionId);

  // Cap interval at exam date if configured
  if (config.examDate) {
    const examDate = new Date(config.examDate);
    const dueDate = new Date(updatedCard.due);
    if (dueDate > examDate) {
      updatedCard = {
        ...updatedCard,
        due: examDate.toISOString(),
        scheduledDays: Math.max(
          0,
          Math.floor((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        ),
      };
    }
  }

  return updatedCard;
}

/**
 * Convert a binary exam result (correct/incorrect) to an FSRS rating
 * Correct answers get Good (3), incorrect get Again (1)
 */
export function examResultToRating(isCorrect: boolean): FSRSRating {
  return isCorrect ? FSRSRating.Good : FSRSRating.Again;
}

/**
 * Get a preview of scheduling options for all ratings
 */
export function getSchedulingPreview(
  card: FSRSCard,
  config: FSRSConfig = DEFAULT_FSRS_CONFIG,
  now: Date = new Date()
): SchedulingPreview {
  const fsrs = createFSRSInstance(config);
  const tsFsrsCard = toTsFsrsCard(card);
  const schedulingCards = fsrs.repeat(tsFsrsCard, now);

  const examDate = config.examDate ? new Date(config.examDate) : null;

  function getPreviewForRating(grade: Grade): { due: string; interval: number } {
    const scheduled = schedulingCards[grade];
    let dueDate = scheduled.card.due;
    let interval = scheduled.card.scheduled_days;

    // Cap at exam date if configured
    if (examDate && dueDate > examDate) {
      dueDate = examDate;
      interval = Math.max(
        0,
        Math.floor((examDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      );
    }

    return {
      due: dueDate.toISOString(),
      interval,
    };
  }

  return {
    [FSRSRating.Again]: getPreviewForRating(Rating.Again),
    [FSRSRating.Hard]: getPreviewForRating(Rating.Hard),
    [FSRSRating.Good]: getPreviewForRating(Rating.Good),
    [FSRSRating.Easy]: getPreviewForRating(Rating.Easy),
  };
}

/**
 * Sort cards by urgency (most overdue first, then by due date)
 */
export function sortCardsByUrgency(cards: FSRSCard[], now: Date = new Date()): FSRSCard[] {
  const nowTime = now.getTime();

  return [...cards].sort((a, b) => {
    const aDue = new Date(a.due).getTime();
    const bDue = new Date(b.due).getTime();

    // Both overdue: most overdue first
    if (aDue <= nowTime && bDue <= nowTime) {
      return aDue - bDue;
    }

    // Only a is overdue: a comes first
    if (aDue <= nowTime) {
      return -1;
    }

    // Only b is overdue: b comes first
    if (bDue <= nowTime) {
      return 1;
    }

    // Both in future: soonest due first
    return aDue - bDue;
  });
}

/**
 * Filter cards that are due for review
 */
export function getDueCards(cards: FSRSCard[], now: Date = new Date()): FSRSCard[] {
  const nowTime = now.getTime();
  return cards.filter((card) => new Date(card.due).getTime() <= nowTime);
}

/**
 * Check if a card is due for review
 */
export function isCardDue(card: FSRSCard, now: Date = new Date()): boolean {
  return new Date(card.due).getTime() <= now.getTime();
}

/**
 * Calculate days until exam from current date
 */
export function getDaysUntilExam(
  examDate: string,
  now: Date = new Date()
): number {
  const exam = new Date(examDate);
  const diffMs = exam.getTime() - now.getTime();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Create an FSRSConfig with exam date set
 */
export function createExamPrepConfig(
  examDate: string,
  now: Date = new Date()
): FSRSConfig {
  const daysUntilExam = getDaysUntilExam(examDate, now);

  return {
    requestRetention: 0.95,
    maximumInterval: Math.max(1, daysUntilExam),
    enableFuzz: false,
    enableShortTerm: true,
    examDate,
  };
}

/**
 * Create a review log entry
 */
export function createReviewLog(
  profileId: string,
  questionId: string,
  rating: FSRSRating,
  source: 'study' | 'exam',
  now: Date = new Date()
): { id: string; profileId: string; questionId: string; rating: FSRSRating; reviewedAt: string; source: 'study' | 'exam' } {
  return {
    id: generateId(),
    profileId,
    questionId,
    rating,
    reviewedAt: now.toISOString(),
    source,
  };
}

/**
 * Format interval for display (e.g., "5m", "2h", "3d")
 */
export function formatInterval(intervalDays: number): string {
  if (intervalDays < 0) {
    return 'now';
  }

  // Less than 1 minute
  if (intervalDays < 1 / (24 * 60)) {
    return '<1m';
  }

  // Minutes (less than 1 hour)
  if (intervalDays < 1 / 24) {
    const minutes = Math.round(intervalDays * 24 * 60);
    return `${minutes}m`;
  }

  // Hours (less than 1 day)
  if (intervalDays < 1) {
    const hours = Math.round(intervalDays * 24);
    return `${hours}h`;
  }

  // Days
  const days = Math.round(intervalDays);
  return `${days}d`;
}

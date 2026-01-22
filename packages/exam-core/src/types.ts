/**
 * Core types for the exam engine
 */

/**
 * Answer option letter (Bulgarian alphabet)
 */
export type AnswerLetter = 'А' | 'Б' | 'В' | 'Г';

/**
 * A single answer option
 */
export interface AnswerOption {
  letter: AnswerLetter;
  text: string;
}

/**
 * A complete exam question
 */
export interface ExamQuestion {
  id: string;
  number: number;
  question: string;
  options: AnswerOption[];
  correctAnswer: AnswerLetter;
}

/**
 * Metadata about an exam section
 */
export interface ExamSectionMetadata {
  sectionNumber: number;
  title: string;
  titleEn: string;
  examClass: string;
  lastUpdated: string;
  sourceFile: string;
}

/**
 * Complete exam section with metadata and questions
 */
export interface ExamSection {
  metadata: ExamSectionMetadata;
  questions: ExamQuestion[];
}

/**
 * Complete exam data containing all sections
 */
export interface ExamData {
  version: string;
  extractedAt: string;
  sections: ExamSection[];
}

/**
 * Configuration for how many questions to select from each section
 */
export interface ExamConfig {
  /** Number of questions to select from each section */
  questionsPerSection: {
    [sectionNumber: number]: number;
  };
  /** Whether to shuffle question order within the exam */
  shuffleQuestions: boolean;
}

/**
 * Default exam configuration
 */
export const DEFAULT_EXAM_CONFIG: ExamConfig = {
  questionsPerSection: {
    1: 20, // Electrical Engineering
    2: 10, // Codes and Abbreviations
    3: 10, // Regulatory Framework
  },
  shuffleQuestions: true,
};

/**
 * A user's answer to a specific question
 */
export interface UserAnswer {
  questionId: string;
  selectedAnswer: AnswerLetter | null;
  isCorrect: boolean;
  answeredAt: Date;
}

/**
 * State of an active exam session
 */
export interface ExamSession {
  id: string;
  userId: string;
  config: ExamConfig;
  questions: ExamQuestion[];
  answers: Map<string, UserAnswer>;
  startedAt: Date;
  completedAt: Date | null;
}

/**
 * Result of a completed exam
 */
export interface ExamResult {
  sessionId: string;
  userId: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unanswered: number;
  score: number; // Percentage 0-100
  passed: boolean;
  completedAt: Date;
  sectionResults: SectionResult[];
}

/**
 * Result breakdown by section
 */
export interface SectionResult {
  sectionNumber: number;
  sectionTitle: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
}

/**
 * User profile for persistence
 */
export interface UserProfile {
  id: string;
  name: string;
  createdAt: Date;
  lastActiveAt: Date;
}

/**
 * Stored exam history entry
 */
export interface ExamHistoryEntry {
  sessionId: string;
  userId: string;
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  completedAt: Date;
  config: ExamConfig;
}

/**
 * Configuration for a study session
 */
export interface StudyConfig {
  /** Section number to study (0 = all sections) */
  sectionNumber: number;
}

/**
 * State of an active study session
 */
export interface StudySession {
  id: string;
  userId: string;
  config: StudyConfig;
  questions: ExamQuestion[];
  viewedQuestions: Set<string>;
  currentSectionNumber: number;
  startedAt: Date;
  lastActiveAt: Date;
}

/**
 * Progress information for a study section
 */
export interface StudyProgress {
  sectionNumber: number;
  sectionTitle: string;
  totalQuestions: number;
  viewedQuestions: number;
  percentage: number;
}

/**
 * Serializable study progress for storage
 */
export interface StoredStudyProgress {
  viewedQuestionIds: string[];
  lastActiveAt: string;
}

// ============================================================================
// FSRS (Free Spaced Repetition Scheduler) Types
// ============================================================================

/**
 * State of a flashcard in the FSRS system
 */
export enum CardState {
  New = 0,
  Learning = 1,
  Review = 2,
  Relearning = 3,
}

/**
 * Rating for how well the user knew an answer
 */
export enum FSRSRating {
  Again = 1,
  Hard = 2,
  Good = 3,
  Easy = 4,
}

/**
 * FSRS card representing a question's learning state
 */
export interface FSRSCard {
  /** Composite key: ${profileId}_${questionId} */
  id: string;
  /** User profile ID */
  profileId: string;
  /** Question ID */
  questionId: string;
  /** Current card state */
  state: CardState;
  /** Next review due date (ISO string) */
  due: string;
  /** Memory stability (days) */
  stability: number;
  /** Card difficulty (0-10 scale) */
  difficulty: number;
  /** Days since last review */
  elapsedDays: number;
  /** Days until next scheduled review */
  scheduledDays: number;
  /** Number of successful reviews */
  reps: number;
  /** Number of times forgotten (rated Again) */
  lapses: number;
  /** Last review date (ISO string, null if never reviewed) */
  lastReview: string | null;
}

/**
 * Log entry for a single review event
 */
export interface FSRSReviewLog {
  /** Unique ID */
  id: string;
  /** User profile ID */
  profileId: string;
  /** Question ID */
  questionId: string;
  /** Rating given */
  rating: FSRSRating;
  /** When the review occurred (ISO string) */
  reviewedAt: string;
  /** Source of the review */
  source: 'study' | 'exam';
}

/**
 * FSRS configuration optimized for exam prep
 */
export interface FSRSConfig {
  /** Target retention rate (0-1). Higher = more frequent reviews. Default 0.95 for exam prep */
  requestRetention: number;
  /** Maximum interval in days. Capped at days until exam */
  maximumInterval: number;
  /** Whether to add randomness to intervals. False for exam prep */
  enableFuzz: boolean;
  /** Enable short-term learning steps (intra-day) */
  enableShortTerm: boolean;
  /** Exam date (ISO string). Used to cap intervals */
  examDate?: string;
}

/**
 * Default FSRS configuration for 7-day exam prep
 */
export const DEFAULT_FSRS_CONFIG: FSRSConfig = {
  requestRetention: 0.95,
  maximumInterval: 7,
  enableFuzz: false,
  enableShortTerm: true,
};

/**
 * Preview of scheduling options for a card
 */
export interface SchedulingPreview {
  [FSRSRating.Again]: { due: string; interval: number };
  [FSRSRating.Hard]: { due: string; interval: number };
  [FSRSRating.Good]: { due: string; interval: number };
  [FSRSRating.Easy]: { due: string; interval: number };
}

/**
 * Statistics about the user's FSRS cards
 */
export interface FSRSStats {
  /** Total cards created */
  totalCards: number;
  /** New cards (never reviewed) */
  newCards: number;
  /** Cards in learning state */
  learningCards: number;
  /** Cards in review state */
  reviewCards: number;
  /** Cards in relearning state */
  relearningCards: number;
  /** Cards due now */
  dueNow: number;
}

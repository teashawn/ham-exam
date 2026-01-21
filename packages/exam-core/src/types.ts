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

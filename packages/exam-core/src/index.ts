/**
 * Exam Core Library
 *
 * Platform-agnostic exam engine for Bulgarian HAM license practice.
 * Includes scoring logic, session management, and storage utilities.
 */

// Types
export type {
  AnswerLetter,
  AnswerOption,
  ExamConfig,
  ExamData,
  ExamHistoryEntry,
  ExamQuestion,
  ExamResult,
  ExamSection,
  ExamSectionMetadata,
  ExamSession,
  SectionResult,
  UserAnswer,
  UserProfile,
} from './types.js';

export { DEFAULT_EXAM_CONFIG } from './types.js';

// Engine functions
export {
  buildExamQuestions,
  calculateScore,
  calculateSectionResult,
  checkAnswer,
  completeExam,
  createExamSession,
  generateId,
  getExamProgress,
  getQuestionsBySection,
  getUnansweredQuestions,
  isPassed,
  recordAnswer,
  selectRandomQuestions,
  shuffleArray,
} from './engine.js';

// Storage functions
export type { StorageAdapter } from './storage.js';

export {
  addToHistory,
  calculateHistoryStats,
  clearExamHistory,
  clearUserProfile,
  createUserProfile,
  getUserHistory,
  loadExamConfig,
  loadExamHistory,
  loadUserProfile,
  saveExamConfig,
  saveExamHistory,
  saveUserProfile,
  updateLastActive,
} from './storage.js';

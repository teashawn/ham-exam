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
  StoredStudyProgress,
  StudyConfig,
  StudyProgress,
  StudySession,
  UserAnswer,
  UserProfile,
  // FSRS types
  FSRSCard,
  FSRSConfig,
  FSRSReviewLog,
  FSRSStats,
  SchedulingPreview,
} from './types.js';

// Export enums and constants (enums are both types and values)
export {
  DEFAULT_EXAM_CONFIG,
  CardState,
  FSRSRating,
  DEFAULT_FSRS_CONFIG,
} from './types.js';

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
  clearStudyProgress,
  clearUserProfile,
  createUserProfile,
  getUserHistory,
  loadExamConfig,
  loadExamHistory,
  loadStudyProgress,
  loadUserProfile,
  saveExamConfig,
  saveExamHistory,
  saveStudyProgress,
  saveUserProfile,
  updateLastActive,
} from './storage.js';

// Study mode functions
export {
  createStudySession,
  getStudyProgress,
  getStudyQuestions,
  getStudySectionQuestions,
  getTotalStudyProgress,
  loadViewedQuestions,
  markQuestionViewed,
  switchStudySection,
} from './study.js';

// FSRS functions
export {
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

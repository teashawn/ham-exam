/**
 * Types for the HAM Exam web application
 */

// Re-export types from exam-core
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
} from '@ham-exam/exam-core';

export { DEFAULT_EXAM_CONFIG } from '@ham-exam/exam-core';

// Web-specific types
export type AppView = 'login' | 'home' | 'config' | 'exam' | 'results' | 'history';

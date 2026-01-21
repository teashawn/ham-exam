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
  StoredStudyProgress,
  StudyConfig,
  StudyProgress,
  StudySession,
  UserAnswer,
  UserProfile,
} from '@ham-exam/exam-core';

export { DEFAULT_EXAM_CONFIG } from '@ham-exam/exam-core';

// Web-specific types
export type AppView =
  | 'login'
  | 'mode-select'      // Mode selection screen (study or exam)
  | 'exam-home'        // Exam dashboard
  | 'study-home'       // Study dashboard (section selection)
  | 'config'
  | 'exam'
  | 'results'
  | 'history'
  | 'study';

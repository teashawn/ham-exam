/**
 * Types for the HAM Exam web application
 */

export type AnswerLetter = 'А' | 'Б' | 'В' | 'Г';

export interface AnswerOption {
  letter: AnswerLetter;
  text: string;
}

export interface ExamQuestion {
  id: string;
  number: number;
  question: string;
  options: AnswerOption[];
  correctAnswer: AnswerLetter;
}

export interface ExamSectionMetadata {
  sectionNumber: number;
  title: string;
  titleEn: string;
  examClass: string;
  lastUpdated: string;
  sourceFile: string;
}

export interface ExamSection {
  metadata: ExamSectionMetadata;
  questions: ExamQuestion[];
}

export interface ExamData {
  version: string;
  extractedAt: string;
  sections: ExamSection[];
}

export interface ExamConfig {
  questionsPerSection: {
    [sectionNumber: number]: number;
  };
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
}

export const DEFAULT_EXAM_CONFIG: ExamConfig = {
  questionsPerSection: {
    1: 20,
    2: 10,
    3: 10,
  },
  shuffleQuestions: true,
  shuffleOptions: false,
};

export interface UserAnswer {
  questionId: string;
  selectedAnswer: AnswerLetter | null;
  isCorrect: boolean;
  answeredAt: Date;
}

export interface ExamSession {
  id: string;
  config: ExamConfig;
  questions: ExamQuestion[];
  answers: Map<string, UserAnswer>;
  startedAt: Date;
  completedAt: Date | null;
}

export interface ExamResult {
  sessionId: string;
  totalQuestions: number;
  correctAnswers: number;
  wrongAnswers: number;
  unanswered: number;
  score: number;
  passed: boolean;
  completedAt: Date;
  sectionResults: SectionResult[];
}

export interface SectionResult {
  sectionNumber: number;
  sectionTitle: string;
  totalQuestions: number;
  correctAnswers: number;
  score: number;
}

export interface UserProfile {
  id: string;
  name: string;
  createdAt: Date;
  lastActiveAt: Date;
}

export interface ExamHistoryEntry {
  sessionId: string;
  score: number;
  passed: boolean;
  totalQuestions: number;
  correctAnswers: number;
  completedAt: Date;
  config: ExamConfig;
}

export type AppView = 'login' | 'home' | 'config' | 'exam' | 'results' | 'history';

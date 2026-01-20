/**
 * Local storage utilities for persistence
 */

import type { ExamConfig, ExamHistoryEntry, ExamResult, UserProfile } from '../types';
import { generateId } from './exam-engine';

const STORAGE_KEYS = {
  USER_PROFILE: 'ham-exam:user-profile',
  EXAM_HISTORY: 'ham-exam:exam-history',
  EXAM_CONFIG: 'ham-exam:exam-config',
} as const;

const MAX_HISTORY_ENTRIES = 50;

// User Profile

export function saveUserProfile(profile: UserProfile): void {
  localStorage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
}

export function loadUserProfile(): UserProfile | null {
  const data = localStorage.getItem(STORAGE_KEYS.USER_PROFILE);
  if (!data) return null;

  try {
    const parsed = JSON.parse(data);
    return {
      ...parsed,
      createdAt: new Date(parsed.createdAt),
      lastActiveAt: new Date(parsed.lastActiveAt),
    };
  } catch {
    return null;
  }
}

export function createUserProfile(name: string): UserProfile {
  const now = new Date();
  return {
    id: generateId(),
    name,
    createdAt: now,
    lastActiveAt: now,
  };
}

export function updateLastActive(profile: UserProfile): UserProfile {
  const updated = {
    ...profile,
    lastActiveAt: new Date(),
  };
  saveUserProfile(updated);
  return updated;
}

export function clearUserProfile(): void {
  localStorage.removeItem(STORAGE_KEYS.USER_PROFILE);
}

// Exam History

export function saveExamHistory(history: ExamHistoryEntry[]): void {
  const trimmed = history.slice(-MAX_HISTORY_ENTRIES);
  localStorage.setItem(STORAGE_KEYS.EXAM_HISTORY, JSON.stringify(trimmed));
}

export function loadExamHistory(): ExamHistoryEntry[] {
  const data = localStorage.getItem(STORAGE_KEYS.EXAM_HISTORY);
  if (!data) return [];

  try {
    const parsed = JSON.parse(data);
    return parsed.map((entry: Record<string, unknown>) => ({
      ...entry,
      completedAt: new Date(entry.completedAt as string),
    }));
  } catch {
    return [];
  }
}

export function addToHistory(result: ExamResult, config: ExamConfig): void {
  const history = loadExamHistory();

  const entry: ExamHistoryEntry = {
    sessionId: result.sessionId,
    score: result.score,
    passed: result.passed,
    totalQuestions: result.totalQuestions,
    correctAnswers: result.correctAnswers,
    completedAt: result.completedAt,
    config,
  };

  history.push(entry);
  saveExamHistory(history);
}

export function clearExamHistory(): void {
  localStorage.removeItem(STORAGE_KEYS.EXAM_HISTORY);
}

// Exam Config

export function saveExamConfig(config: ExamConfig): void {
  localStorage.setItem(STORAGE_KEYS.EXAM_CONFIG, JSON.stringify(config));
}

export function loadExamConfig(): ExamConfig | null {
  const data = localStorage.getItem(STORAGE_KEYS.EXAM_CONFIG);
  if (!data) return null;

  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

// Statistics

export function calculateHistoryStats(history: ExamHistoryEntry[]): {
  totalExams: number;
  passedExams: number;
  averageScore: number;
  bestScore: number;
  passRate: number;
} {
  if (history.length === 0) {
    return {
      totalExams: 0,
      passedExams: 0,
      averageScore: 0,
      bestScore: 0,
      passRate: 0,
    };
  }

  const passedExams = history.filter((e) => e.passed).length;
  const totalScore = history.reduce((sum, e) => sum + e.score, 0);
  const bestScore = Math.max(...history.map((e) => e.score));

  return {
    totalExams: history.length,
    passedExams,
    averageScore: Math.round(totalScore / history.length),
    bestScore,
    passRate: Math.round((passedExams / history.length) * 100),
  };
}

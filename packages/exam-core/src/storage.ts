/**
 * Storage utilities for exam data persistence
 * Works with any storage interface (localStorage, sessionStorage, etc.)
 */

import type {
  ExamConfig,
  ExamHistoryEntry,
  ExamResult,
  UserProfile,
} from './types.js';
import { generateId } from './engine.js';

/**
 * Storage interface for platform-agnostic persistence
 */
export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/**
 * Storage keys
 */
const STORAGE_KEYS = {
  USER_PROFILE: 'ham-exam:user-profile',
  EXAM_HISTORY: 'ham-exam:exam-history',
  EXAM_CONFIG: 'ham-exam:exam-config',
} as const;

/**
 * Maximum history entries to keep
 */
const MAX_HISTORY_ENTRIES = 50;

/**
 * Save user profile
 */
export function saveUserProfile(
  storage: StorageAdapter,
  profile: UserProfile
): void {
  storage.setItem(STORAGE_KEYS.USER_PROFILE, JSON.stringify(profile));
}

/**
 * Load user profile
 */
export function loadUserProfile(
  storage: StorageAdapter
): UserProfile | null {
  const data = storage.getItem(STORAGE_KEYS.USER_PROFILE);
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

/**
 * Create a new user profile
 */
export function createUserProfile(name: string): UserProfile {
  const now = new Date();
  return {
    id: generateId(),
    name,
    createdAt: now,
    lastActiveAt: now,
  };
}

/**
 * Update last active timestamp
 */
export function updateLastActive(
  storage: StorageAdapter,
  profile: UserProfile
): UserProfile {
  const updated = {
    ...profile,
    lastActiveAt: new Date(),
  };
  saveUserProfile(storage, updated);
  return updated;
}

/**
 * Clear user profile (logout)
 */
export function clearUserProfile(storage: StorageAdapter): void {
  storage.removeItem(STORAGE_KEYS.USER_PROFILE);
}

/**
 * Save exam history
 */
export function saveExamHistory(
  storage: StorageAdapter,
  history: ExamHistoryEntry[]
): void {
  // Keep only the most recent entries
  const trimmed = history.slice(-MAX_HISTORY_ENTRIES);
  storage.setItem(STORAGE_KEYS.EXAM_HISTORY, JSON.stringify(trimmed));
}

/**
 * Load exam history
 */
export function loadExamHistory(
  storage: StorageAdapter
): ExamHistoryEntry[] {
  const data = storage.getItem(STORAGE_KEYS.EXAM_HISTORY);
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

/**
 * Add exam result to history
 */
export function addToHistory(
  storage: StorageAdapter,
  result: ExamResult,
  config: ExamConfig
): void {
  const history = loadExamHistory(storage);

  const entry: ExamHistoryEntry = {
    sessionId: result.sessionId,
    userId: result.userId,
    score: result.score,
    passed: result.passed,
    totalQuestions: result.totalQuestions,
    correctAnswers: result.correctAnswers,
    completedAt: result.completedAt,
    config,
  };

  history.push(entry);
  saveExamHistory(storage, history);
}

/**
 * Get history for a specific user
 */
export function getUserHistory(
  storage: StorageAdapter,
  userId: string
): ExamHistoryEntry[] {
  const history = loadExamHistory(storage);
  return history.filter((entry) => entry.userId === userId);
}

/**
 * Clear all exam history
 */
export function clearExamHistory(storage: StorageAdapter): void {
  storage.removeItem(STORAGE_KEYS.EXAM_HISTORY);
}

/**
 * Save exam configuration preferences
 */
export function saveExamConfig(
  storage: StorageAdapter,
  config: ExamConfig
): void {
  storage.setItem(STORAGE_KEYS.EXAM_CONFIG, JSON.stringify(config));
}

/**
 * Load exam configuration preferences
 */
export function loadExamConfig(
  storage: StorageAdapter
): ExamConfig | null {
  const data = storage.getItem(STORAGE_KEYS.EXAM_CONFIG);
  if (!data) return null;

  try {
    return JSON.parse(data);
  } catch {
    return null;
  }
}

/**
 * Calculate statistics from history
 */
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

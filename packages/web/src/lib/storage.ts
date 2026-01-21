/**
 * Browser-specific storage utilities that wrap exam-core storage functions
 * with localStorage as the storage adapter.
 */

import type { ExamConfig, ExamHistoryEntry, ExamResult, UserProfile } from '@ham-exam/exam-core';
import {
  saveUserProfile as coreSaveUserProfile,
  loadUserProfile as coreLoadUserProfile,
  createUserProfile as coreCreateUserProfile,
  updateLastActive as coreUpdateLastActive,
  clearUserProfile as coreClearUserProfile,
  saveExamHistory as coreSaveExamHistory,
  loadExamHistory as coreLoadExamHistory,
  addToHistory as coreAddToHistory,
  getUserHistory as coreGetUserHistory,
  clearExamHistory as coreClearExamHistory,
  saveExamConfig as coreSaveExamConfig,
  loadExamConfig as coreLoadExamConfig,
  calculateHistoryStats,
} from '@ham-exam/exam-core';

// Re-export functions that don't need storage adapter
export { createUserProfile } from '@ham-exam/exam-core';
export { calculateHistoryStats } from '@ham-exam/exam-core';

// Wrapper functions that use localStorage

export function saveUserProfile(profile: UserProfile): void {
  coreSaveUserProfile(localStorage, profile);
}

export function loadUserProfile(): UserProfile | null {
  return coreLoadUserProfile(localStorage);
}

export function updateLastActive(profile: UserProfile): UserProfile {
  return coreUpdateLastActive(localStorage, profile);
}

export function clearUserProfile(): void {
  coreClearUserProfile(localStorage);
}

export function saveExamHistory(history: ExamHistoryEntry[]): void {
  coreSaveExamHistory(localStorage, history);
}

export function loadExamHistory(): ExamHistoryEntry[] {
  return coreLoadExamHistory(localStorage);
}

export function addToHistory(result: ExamResult, config: ExamConfig): void {
  coreAddToHistory(localStorage, result, config);
}

export function getUserHistory(userId: string): ExamHistoryEntry[] {
  return coreGetUserHistory(localStorage, userId);
}

export function clearExamHistory(): void {
  coreClearExamHistory(localStorage);
}

export function saveExamConfig(config: ExamConfig): void {
  coreSaveExamConfig(localStorage, config);
}

export function loadExamConfig(): ExamConfig | null {
  return coreLoadExamConfig(localStorage);
}

/**
 * Browser-specific storage utilities that wrap exam-core storage functions
 * with localStorage as the storage adapter.
 */

import type { ExamConfig, ExamHistoryEntry, ExamResult, StoredStudyProgress, UserProfile } from '@ham-exam/exam-core';
import {
  saveUserProfile as coreSaveUserProfile,
  loadUserProfile as coreLoadUserProfile,
  updateLastActive as coreUpdateLastActive,
  clearUserProfile as coreClearUserProfile,
  saveExamHistory as coreSaveExamHistory,
  loadExamHistory as coreLoadExamHistory,
  addToHistory as coreAddToHistory,
  getUserHistory as coreGetUserHistory,
  clearExamHistory as coreClearExamHistory,
  saveExamConfig as coreSaveExamConfig,
  loadExamConfig as coreLoadExamConfig,
  saveStudyProgress as coreSaveStudyProgress,
  loadStudyProgress as coreLoadStudyProgress,
  clearStudyProgress as coreClearStudyProgress,
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

export function saveStudyProgress(userId: string, viewedQuestionIds: string[]): void {
  coreSaveStudyProgress(localStorage, userId, viewedQuestionIds);
}

export function loadStudyProgress(userId: string): StoredStudyProgress | null {
  return coreLoadStudyProgress(localStorage, userId);
}

export function clearStudyProgress(userId: string): void {
  coreClearStudyProgress(localStorage, userId);
}

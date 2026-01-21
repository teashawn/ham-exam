import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  saveUserProfile,
  loadUserProfile,
  createUserProfile,
  updateLastActive,
  clearUserProfile,
  saveExamHistory,
  loadExamHistory,
  addToHistory,
  getUserHistory,
  clearExamHistory,
  saveExamConfig,
  loadExamConfig,
  calculateHistoryStats,
} from './storage';
import type { ExamConfig, ExamHistoryEntry, ExamResult, UserProfile } from '@ham-exam/exam-core';

// Mock localStorage
const mockStorage: Record<string, string> = {};
const localStorageMock = {
  getItem: vi.fn((key: string) => mockStorage[key] || null),
  setItem: vi.fn((key: string, value: string) => {
    mockStorage[key] = value;
  }),
  removeItem: vi.fn((key: string) => {
    delete mockStorage[key];
  }),
  clear: vi.fn(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  }),
};

Object.defineProperty(globalThis, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

describe('storage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  });

  describe('User Profile', () => {
    const testProfile: UserProfile = {
      id: 'test-id',
      name: 'Test User',
      createdAt: new Date('2024-01-01'),
      lastActiveAt: new Date('2024-01-02'),
    };

    it('should save user profile', () => {
      saveUserProfile(testProfile);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ham-exam:user-profile',
        expect.any(String)
      );
    });

    it('should load user profile', () => {
      mockStorage['ham-exam:user-profile'] = JSON.stringify(testProfile);
      const loaded = loadUserProfile();

      expect(loaded).not.toBeNull();
      expect(loaded?.id).toBe('test-id');
      expect(loaded?.name).toBe('Test User');
    });

    it('should return null for missing profile', () => {
      const loaded = loadUserProfile();
      expect(loaded).toBeNull();
    });

    it('should create user profile', () => {
      const profile = createUserProfile('New User');
      expect(profile.name).toBe('New User');
      expect(profile.id).toBeTruthy();
    });

    it('should update last active', () => {
      const profile = createUserProfile('Test');
      const updated = updateLastActive(profile);
      expect(updated.lastActiveAt.getTime()).toBeGreaterThanOrEqual(
        profile.lastActiveAt.getTime()
      );
    });

    it('should clear user profile', () => {
      clearUserProfile();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('ham-exam:user-profile');
    });
  });

  describe('Exam History', () => {
    const testEntry: ExamHistoryEntry = {
      sessionId: 'session-1',
      userId: 'user-1',
      score: 80,
      passed: true,
      totalQuestions: 40,
      correctAnswers: 32,
      completedAt: new Date('2024-01-01'),
      config: {
        questionsPerSection: { 1: 20, 2: 10, 3: 10 },
        shuffleQuestions: true,
        shuffleOptions: false,
      },
    };

    it('should save exam history', () => {
      saveExamHistory([testEntry]);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ham-exam:exam-history',
        expect.any(String)
      );
    });

    it('should load exam history', () => {
      mockStorage['ham-exam:exam-history'] = JSON.stringify([testEntry]);
      const loaded = loadExamHistory();
      expect(loaded.length).toBe(1);
      expect(loaded[0].sessionId).toBe('session-1');
    });

    it('should return empty array for missing history', () => {
      const loaded = loadExamHistory();
      expect(loaded).toEqual([]);
    });

    it('should add to history', () => {
      const result: ExamResult = {
        sessionId: 'new-session',
        userId: 'user-1',
        totalQuestions: 40,
        correctAnswers: 35,
        wrongAnswers: 5,
        unanswered: 0,
        score: 87,
        passed: true,
        completedAt: new Date(),
        sectionResults: [],
      };

      const config: ExamConfig = {
        questionsPerSection: { 1: 20, 2: 10, 3: 10 },
        shuffleQuestions: true,
        shuffleOptions: false,
      };

      addToHistory(result, config);
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should get user history', () => {
      const entries = [
        { ...testEntry, userId: 'user-1' },
        { ...testEntry, sessionId: 'session-2', userId: 'user-2' },
      ];
      mockStorage['ham-exam:exam-history'] = JSON.stringify(entries);

      const userHistory = getUserHistory('user-1');
      expect(userHistory.length).toBe(1);
      expect(userHistory[0].userId).toBe('user-1');
    });

    it('should clear exam history', () => {
      clearExamHistory();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('ham-exam:exam-history');
    });
  });

  describe('Exam Config', () => {
    const testConfig: ExamConfig = {
      questionsPerSection: { 1: 15, 2: 8, 3: 7 },
      shuffleQuestions: false,
      shuffleOptions: true,
    };

    it('should save exam config', () => {
      saveExamConfig(testConfig);
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'ham-exam:exam-config',
        expect.any(String)
      );
    });

    it('should load exam config', () => {
      mockStorage['ham-exam:exam-config'] = JSON.stringify(testConfig);
      const loaded = loadExamConfig();
      expect(loaded).toEqual(testConfig);
    });

    it('should return null for missing config', () => {
      const loaded = loadExamConfig();
      expect(loaded).toBeNull();
    });
  });

  describe('calculateHistoryStats', () => {
    it('should return zeros for empty history', () => {
      const stats = calculateHistoryStats([]);
      expect(stats.totalExams).toBe(0);
      expect(stats.averageScore).toBe(0);
    });

    it('should calculate stats correctly', () => {
      const history: ExamHistoryEntry[] = [
        {
          sessionId: '1',
          userId: 'user-1',
          score: 80,
          passed: true,
          totalQuestions: 40,
          correctAnswers: 32,
          completedAt: new Date(),
          config: { questionsPerSection: {}, shuffleQuestions: true, shuffleOptions: false },
        },
        {
          sessionId: '2',
          userId: 'user-1',
          score: 60,
          passed: false,
          totalQuestions: 40,
          correctAnswers: 24,
          completedAt: new Date(),
          config: { questionsPerSection: {}, shuffleQuestions: true, shuffleOptions: false },
        },
      ];

      const stats = calculateHistoryStats(history);
      expect(stats.totalExams).toBe(2);
      expect(stats.passedExams).toBe(1);
      expect(stats.bestScore).toBe(80);
    });
  });
});

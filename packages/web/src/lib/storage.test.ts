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
  clearExamHistory,
  saveExamConfig,
  loadExamConfig,
  calculateHistoryStats,
} from './storage';
import type { ExamConfig, ExamHistoryEntry, ExamResult, UserProfile } from '../types';

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
      expect(loaded?.createdAt).toBeInstanceOf(Date);
      expect(loaded?.lastActiveAt).toBeInstanceOf(Date);
    });

    it('should return null for missing profile', () => {
      const loaded = loadUserProfile();
      expect(loaded).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      mockStorage['ham-exam:user-profile'] = 'invalid json';
      const loaded = loadUserProfile();
      expect(loaded).toBeNull();
    });

    it('should create user profile', () => {
      const profile = createUserProfile('New User');
      expect(profile.name).toBe('New User');
      expect(profile.id).toBeTruthy();
      expect(profile.createdAt).toBeInstanceOf(Date);
      expect(profile.lastActiveAt).toBeInstanceOf(Date);
    });

    it('should update last active', () => {
      const profile = createUserProfile('Test');
      const originalLastActive = profile.lastActiveAt;

      // Small delay to ensure different timestamp
      const updated = updateLastActive(profile);

      expect(updated.lastActiveAt.getTime()).toBeGreaterThanOrEqual(
        originalLastActive.getTime()
      );
      expect(localStorageMock.setItem).toHaveBeenCalled();
    });

    it('should clear user profile', () => {
      clearUserProfile();
      expect(localStorageMock.removeItem).toHaveBeenCalledWith('ham-exam:user-profile');
    });
  });

  describe('Exam History', () => {
    const testEntry: ExamHistoryEntry = {
      sessionId: 'session-1',
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

    it('should trim history to max entries', () => {
      const manyEntries = Array.from({ length: 60 }, (_, i) => ({
        ...testEntry,
        sessionId: `session-${i}`,
      }));
      saveExamHistory(manyEntries);

      const saved = JSON.parse(mockStorage['ham-exam:exam-history']);
      expect(saved.length).toBe(50);
    });

    it('should load exam history', () => {
      mockStorage['ham-exam:exam-history'] = JSON.stringify([testEntry]);
      const loaded = loadExamHistory();

      expect(loaded.length).toBe(1);
      expect(loaded[0].sessionId).toBe('session-1');
      expect(loaded[0].completedAt).toBeInstanceOf(Date);
    });

    it('should return empty array for missing history', () => {
      const loaded = loadExamHistory();
      expect(loaded).toEqual([]);
    });

    it('should return empty array for invalid JSON', () => {
      mockStorage['ham-exam:exam-history'] = 'invalid json';
      const loaded = loadExamHistory();
      expect(loaded).toEqual([]);
    });

    it('should add to history', () => {
      const result: ExamResult = {
        sessionId: 'new-session',
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

    it('should return null for invalid JSON', () => {
      mockStorage['ham-exam:exam-config'] = 'invalid json';
      const loaded = loadExamConfig();
      expect(loaded).toBeNull();
    });
  });

  describe('calculateHistoryStats', () => {
    it('should return zeros for empty history', () => {
      const stats = calculateHistoryStats([]);
      expect(stats).toEqual({
        totalExams: 0,
        passedExams: 0,
        averageScore: 0,
        bestScore: 0,
        passRate: 0,
      });
    });

    it('should calculate stats correctly', () => {
      const history: ExamHistoryEntry[] = [
        {
          sessionId: '1',
          score: 80,
          passed: true,
          totalQuestions: 40,
          correctAnswers: 32,
          completedAt: new Date(),
          config: { questionsPerSection: {}, shuffleQuestions: true, shuffleOptions: false },
        },
        {
          sessionId: '2',
          score: 60,
          passed: false,
          totalQuestions: 40,
          correctAnswers: 24,
          completedAt: new Date(),
          config: { questionsPerSection: {}, shuffleQuestions: true, shuffleOptions: false },
        },
        {
          sessionId: '3',
          score: 90,
          passed: true,
          totalQuestions: 40,
          correctAnswers: 36,
          completedAt: new Date(),
          config: { questionsPerSection: {}, shuffleQuestions: true, shuffleOptions: false },
        },
      ];

      const stats = calculateHistoryStats(history);

      expect(stats.totalExams).toBe(3);
      expect(stats.passedExams).toBe(2);
      expect(stats.averageScore).toBe(77); // (80 + 60 + 90) / 3 = 76.67, rounded to 77
      expect(stats.bestScore).toBe(90);
      expect(stats.passRate).toBe(67); // 2/3 = 66.67%, rounded to 67
    });
  });
});

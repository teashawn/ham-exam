import { describe, it, expect, beforeEach } from 'vitest';
import {
  addToHistory,
  calculateHistoryStats,
  clearExamHistory,
  clearUserProfile,
  createUserProfile,
  getUserHistory,
  loadExamConfig,
  loadExamHistory,
  loadUserProfile,
  saveExamConfig,
  saveExamHistory,
  saveUserProfile,
  updateLastActive,
} from './storage.js';
import type { StorageAdapter } from './storage.js';
import type { ExamConfig, ExamHistoryEntry, ExamResult, UserProfile } from './types.js';

// Mock storage adapter
class MockStorage implements StorageAdapter {
  private store = new Map<string, string>();

  getItem(key: string): string | null {
    return this.store.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }

  removeItem(key: string): void {
    this.store.delete(key);
  }

  clear(): void {
    this.store.clear();
  }
}

describe('User Profile Storage', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  describe('createUserProfile', () => {
    it('should create profile with correct properties', () => {
      const profile = createUserProfile('Test User');

      expect(profile.id).toBeTruthy();
      expect(profile.name).toBe('Test User');
      expect(profile.createdAt).toBeInstanceOf(Date);
      expect(profile.lastActiveAt).toBeInstanceOf(Date);
    });

    it('should generate unique IDs', () => {
      const profile1 = createUserProfile('User 1');
      const profile2 = createUserProfile('User 2');

      expect(profile1.id).not.toBe(profile2.id);
    });
  });

  describe('saveUserProfile / loadUserProfile', () => {
    it('should save and load profile', () => {
      const profile = createUserProfile('Test User');
      saveUserProfile(storage, profile);

      const loaded = loadUserProfile(storage);

      expect(loaded).not.toBeNull();
      expect(loaded!.id).toBe(profile.id);
      expect(loaded!.name).toBe(profile.name);
    });

    it('should return null for no profile', () => {
      const loaded = loadUserProfile(storage);
      expect(loaded).toBeNull();
    });

    it('should return null for invalid data', () => {
      storage.setItem('ham-exam:user-profile', 'invalid json');
      const loaded = loadUserProfile(storage);
      expect(loaded).toBeNull();
    });

    it('should convert dates back to Date objects', () => {
      const profile = createUserProfile('Test User');
      saveUserProfile(storage, profile);

      const loaded = loadUserProfile(storage);

      expect(loaded!.createdAt).toBeInstanceOf(Date);
      expect(loaded!.lastActiveAt).toBeInstanceOf(Date);
    });
  });

  describe('updateLastActive', () => {
    it('should update lastActiveAt', () => {
      const profile = createUserProfile('Test User');
      const originalLastActive = profile.lastActiveAt;

      // Wait a bit to ensure timestamp changes
      const updated = updateLastActive(storage, profile);

      expect(updated.lastActiveAt.getTime()).toBeGreaterThanOrEqual(
        originalLastActive.getTime()
      );
    });

    it('should save updated profile', () => {
      const profile = createUserProfile('Test User');
      updateLastActive(storage, profile);

      const loaded = loadUserProfile(storage);
      expect(loaded).not.toBeNull();
    });
  });

  describe('clearUserProfile', () => {
    it('should remove profile from storage', () => {
      const profile = createUserProfile('Test User');
      saveUserProfile(storage, profile);

      clearUserProfile(storage);

      const loaded = loadUserProfile(storage);
      expect(loaded).toBeNull();
    });
  });
});

describe('Exam History Storage', () => {
  let storage: MockStorage;

  const createMockResult = (score: number, passed: boolean): ExamResult => ({
    sessionId: `session-${Date.now()}`,
    userId: 'user-123',
    totalQuestions: 40,
    correctAnswers: Math.round(score * 0.4),
    wrongAnswers: 40 - Math.round(score * 0.4),
    unanswered: 0,
    score,
    passed,
    completedAt: new Date(),
    sectionResults: [],
  });

  const mockConfig: ExamConfig = {
    questionsPerSection: { 1: 20, 2: 10, 3: 10 },
    shuffleQuestions: true,
    shuffleOptions: false,
  };

  beforeEach(() => {
    storage = new MockStorage();
  });

  describe('saveExamHistory / loadExamHistory', () => {
    it('should save and load history', () => {
      const entry: ExamHistoryEntry = {
        sessionId: 'session-1',
        userId: 'user-123',
        score: 80,
        passed: true,
        totalQuestions: 40,
        correctAnswers: 32,
        completedAt: new Date(),
        config: mockConfig,
      };

      saveExamHistory(storage, [entry]);
      const loaded = loadExamHistory(storage);

      expect(loaded.length).toBe(1);
      expect(loaded[0].sessionId).toBe('session-1');
    });

    it('should return empty array for no history', () => {
      const loaded = loadExamHistory(storage);
      expect(loaded).toEqual([]);
    });

    it('should return empty array for invalid data', () => {
      storage.setItem('ham-exam:exam-history', 'invalid json');
      const loaded = loadExamHistory(storage);
      expect(loaded).toEqual([]);
    });

    it('should convert completedAt back to Date', () => {
      const entry: ExamHistoryEntry = {
        sessionId: 'session-1',
        userId: 'user-123',
        score: 80,
        passed: true,
        totalQuestions: 40,
        correctAnswers: 32,
        completedAt: new Date(),
        config: mockConfig,
      };

      saveExamHistory(storage, [entry]);
      const loaded = loadExamHistory(storage);

      expect(loaded[0].completedAt).toBeInstanceOf(Date);
    });

    it('should limit history to 50 entries', () => {
      const entries: ExamHistoryEntry[] = Array.from({ length: 60 }, (_, i) => ({
        sessionId: `session-${i}`,
        userId: 'user-123',
        score: 80,
        passed: true,
        totalQuestions: 40,
        correctAnswers: 32,
        completedAt: new Date(),
        config: mockConfig,
      }));

      saveExamHistory(storage, entries);
      const loaded = loadExamHistory(storage);

      expect(loaded.length).toBe(50);
    });
  });

  describe('addToHistory', () => {
    it('should add result to history', () => {
      const result = createMockResult(80, true);
      addToHistory(storage, result, mockConfig);

      const loaded = loadExamHistory(storage);
      expect(loaded.length).toBe(1);
      expect(loaded[0].score).toBe(80);
    });

    it('should append to existing history', () => {
      addToHistory(storage, createMockResult(70, false), mockConfig);
      addToHistory(storage, createMockResult(80, true), mockConfig);

      const loaded = loadExamHistory(storage);
      expect(loaded.length).toBe(2);
    });
  });

  describe('getUserHistory', () => {
    it('should filter by user ID', () => {
      const entry1: ExamHistoryEntry = {
        sessionId: 'session-1',
        userId: 'user-123',
        score: 80,
        passed: true,
        totalQuestions: 40,
        correctAnswers: 32,
        completedAt: new Date(),
        config: mockConfig,
      };

      const entry2: ExamHistoryEntry = {
        sessionId: 'session-2',
        userId: 'user-456',
        score: 70,
        passed: false,
        totalQuestions: 40,
        correctAnswers: 28,
        completedAt: new Date(),
        config: mockConfig,
      };

      saveExamHistory(storage, [entry1, entry2]);

      const user123History = getUserHistory(storage, 'user-123');
      expect(user123History.length).toBe(1);
      expect(user123History[0].userId).toBe('user-123');

      const user456History = getUserHistory(storage, 'user-456');
      expect(user456History.length).toBe(1);
      expect(user456History[0].userId).toBe('user-456');
    });
  });

  describe('clearExamHistory', () => {
    it('should clear all history', () => {
      addToHistory(storage, createMockResult(80, true), mockConfig);
      addToHistory(storage, createMockResult(70, false), mockConfig);

      clearExamHistory(storage);

      const loaded = loadExamHistory(storage);
      expect(loaded).toEqual([]);
    });
  });
});

describe('Exam Config Storage', () => {
  let storage: MockStorage;

  beforeEach(() => {
    storage = new MockStorage();
  });

  describe('saveExamConfig / loadExamConfig', () => {
    it('should save and load config', () => {
      const config: ExamConfig = {
        questionsPerSection: { 1: 15, 2: 5, 3: 5 },
        shuffleQuestions: true,
        shuffleOptions: true,
      };

      saveExamConfig(storage, config);
      const loaded = loadExamConfig(storage);

      expect(loaded).toEqual(config);
    });

    it('should return null for no config', () => {
      const loaded = loadExamConfig(storage);
      expect(loaded).toBeNull();
    });

    it('should return null for invalid data', () => {
      storage.setItem('ham-exam:exam-config', 'invalid json');
      const loaded = loadExamConfig(storage);
      expect(loaded).toBeNull();
    });
  });
});

describe('calculateHistoryStats', () => {
  const createEntry = (score: number): ExamHistoryEntry => ({
    sessionId: `session-${Date.now()}`,
    userId: 'user-123',
    score,
    passed: score >= 75,
    totalQuestions: 40,
    correctAnswers: Math.round(score * 0.4),
    completedAt: new Date(),
    config: {
      questionsPerSection: { 1: 20, 2: 10, 3: 10 },
      shuffleQuestions: true,
      shuffleOptions: false,
    },
  });

  it('should calculate correct stats', () => {
    const history = [
      createEntry(80),
      createEntry(75),
      createEntry(60),
      createEntry(90),
    ];

    const stats = calculateHistoryStats(history);

    expect(stats.totalExams).toBe(4);
    expect(stats.passedExams).toBe(3); // 80, 75, 90 pass
    expect(stats.averageScore).toBe(76); // (80+75+60+90)/4 = 76.25 -> 76
    expect(stats.bestScore).toBe(90);
    expect(stats.passRate).toBe(75); // 3/4 = 75%
  });

  it('should handle empty history', () => {
    const stats = calculateHistoryStats([]);

    expect(stats.totalExams).toBe(0);
    expect(stats.passedExams).toBe(0);
    expect(stats.averageScore).toBe(0);
    expect(stats.bestScore).toBe(0);
    expect(stats.passRate).toBe(0);
  });

  it('should handle all passed', () => {
    const history = [createEntry(80), createEntry(85), createEntry(90)];
    const stats = calculateHistoryStats(history);

    expect(stats.passRate).toBe(100);
  });

  it('should handle all failed', () => {
    const history = [createEntry(50), createEntry(60), createEntry(70)];
    const stats = calculateHistoryStats(history);

    expect(stats.passRate).toBe(0);
    expect(stats.passedExams).toBe(0);
  });
});

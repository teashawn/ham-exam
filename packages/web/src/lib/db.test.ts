import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import 'fake-indexeddb/auto';
import {
  createFSRSDatabase,
  getDatabase,
  resetDatabase,
  getOrCreateCard,
  updateCard,
  getCardsForProfile,
  getDueCardsForProfile,
  addReviewLog,
  getReviewLogsForProfile,
  getFSRSConfig,
  saveFSRSConfig,
  migrateFromLocalStorage,
  exportProfileData,
  importProfileData,
  clearProfileData,
  deleteDatabase,
  type FSRSDatabase,
} from './db';
import { CardState, FSRSRating, DEFAULT_FSRS_CONFIG } from '@ham-exam/exam-core';
import type { FSRSCard, FSRSConfig, FSRSReviewLog } from '@ham-exam/exam-core';

describe('FSRS Database', () => {
  let db: FSRSDatabase;

  beforeEach(async () => {
    resetDatabase();
    db = createFSRSDatabase();
    await db.open();
  });

  afterEach(async () => {
    await deleteDatabase();
  });

  describe('createFSRSDatabase', () => {
    it('should create a database with correct tables', async () => {
      expect(db.cards).toBeDefined();
      expect(db.reviewLogs).toBeDefined();
      expect(db.fsrsConfigs).toBeDefined();
    });
  });

  describe('getDatabase', () => {
    it('should return singleton database instance', () => {
      resetDatabase();
      const db1 = getDatabase();
      const db2 = getDatabase();
      expect(db1).toBe(db2);
    });

    it('should create new instance after reset', () => {
      const db1 = getDatabase();
      resetDatabase();
      const db2 = getDatabase();
      expect(db1).not.toBe(db2);
    });
  });

  describe('getOrCreateCard', () => {
    const now = new Date('2024-01-15T12:00:00.000Z');

    it('should create a new card if not exists', async () => {
      const card = await getOrCreateCard(db, 'profile1', 'q1', now);

      expect(card.id).toBe('profile1_q1');
      expect(card.profileId).toBe('profile1');
      expect(card.questionId).toBe('q1');
      expect(card.state).toBe(CardState.New);
    });

    it('should return existing card if already exists', async () => {
      // Create initial card
      const card1 = await getOrCreateCard(db, 'profile1', 'q1', now);

      // Modify and save
      const modifiedCard = { ...card1, reps: 5 };
      await updateCard(db, modifiedCard);

      // Get again
      const card2 = await getOrCreateCard(db, 'profile1', 'q1', now);

      expect(card2.reps).toBe(5);
    });
  });

  describe('updateCard', () => {
    it('should update card in database', async () => {
      const now = new Date('2024-01-15T12:00:00.000Z');
      const card = await getOrCreateCard(db, 'profile1', 'q1', now);

      const updatedCard: FSRSCard = {
        ...card,
        state: CardState.Review,
        reps: 3,
        stability: 10,
      };

      await updateCard(db, updatedCard);

      const retrieved = await db.cards.get(card.id);
      expect(retrieved?.state).toBe(CardState.Review);
      expect(retrieved?.reps).toBe(3);
      expect(retrieved?.stability).toBe(10);
    });
  });

  describe('getCardsForProfile', () => {
    it('should return all cards for a profile', async () => {
      const now = new Date('2024-01-15T12:00:00.000Z');

      await getOrCreateCard(db, 'profile1', 'q1', now);
      await getOrCreateCard(db, 'profile1', 'q2', now);
      await getOrCreateCard(db, 'profile2', 'q1', now);

      const cards = await getCardsForProfile(db, 'profile1');

      expect(cards.length).toBe(2);
      expect(cards.map((c) => c.questionId)).toContain('q1');
      expect(cards.map((c) => c.questionId)).toContain('q2');
    });

    it('should return empty array if no cards exist', async () => {
      const cards = await getCardsForProfile(db, 'nonexistent');
      expect(cards).toEqual([]);
    });
  });

  describe('getDueCardsForProfile', () => {
    const now = new Date('2024-01-15T12:00:00.000Z');

    it('should return only due cards', async () => {
      // Create some cards
      await getOrCreateCard(db, 'profile1', 'q1', now);
      const card2 = await getOrCreateCard(db, 'profile1', 'q2', now);

      // Make card2 due in the future
      await updateCard(db, {
        ...card2,
        due: '2024-01-16T12:00:00.000Z',
      });

      const dueCards = await getDueCardsForProfile(db, 'profile1', now);

      expect(dueCards.length).toBe(1);
      expect(dueCards[0].questionId).toBe('q1');
    });

    it('should include cards due exactly at now', async () => {
      await getOrCreateCard(db, 'profile1', 'q1', now);

      const dueCards = await getDueCardsForProfile(db, 'profile1', now);
      expect(dueCards.length).toBe(1);
    });
  });

  describe('addReviewLog', () => {
    it('should add review log to database', async () => {
      const log: FSRSReviewLog = {
        id: 'log1',
        profileId: 'profile1',
        questionId: 'q1',
        rating: FSRSRating.Good,
        reviewedAt: '2024-01-15T12:00:00.000Z',
        source: 'study',
      };

      await addReviewLog(db, log);

      const retrieved = await db.reviewLogs.get('log1');
      expect(retrieved).toEqual(log);
    });
  });

  describe('getReviewLogsForProfile', () => {
    it('should return all logs for a profile', async () => {
      const logs: FSRSReviewLog[] = [
        {
          id: 'log1',
          profileId: 'profile1',
          questionId: 'q1',
          rating: FSRSRating.Good,
          reviewedAt: '2024-01-15T12:00:00.000Z',
          source: 'study',
        },
        {
          id: 'log2',
          profileId: 'profile1',
          questionId: 'q2',
          rating: FSRSRating.Again,
          reviewedAt: '2024-01-15T13:00:00.000Z',
          source: 'exam',
        },
        {
          id: 'log3',
          profileId: 'profile2',
          questionId: 'q1',
          rating: FSRSRating.Easy,
          reviewedAt: '2024-01-15T14:00:00.000Z',
          source: 'study',
        },
      ];

      for (const log of logs) {
        await addReviewLog(db, log);
      }

      const profileLogs = await getReviewLogsForProfile(db, 'profile1');

      expect(profileLogs.length).toBe(2);
      expect(profileLogs.map((l) => l.id)).toContain('log1');
      expect(profileLogs.map((l) => l.id)).toContain('log2');
    });
  });

  describe('getFSRSConfig', () => {
    it('should return default config if none saved', async () => {
      const config = await getFSRSConfig(db, 'profile1');

      expect(config.requestRetention).toBe(DEFAULT_FSRS_CONFIG.requestRetention);
      expect(config.maximumInterval).toBe(DEFAULT_FSRS_CONFIG.maximumInterval);
      expect(config.enableFuzz).toBe(DEFAULT_FSRS_CONFIG.enableFuzz);
      expect(config.enableShortTerm).toBe(DEFAULT_FSRS_CONFIG.enableShortTerm);
    });

    it('should return saved config', async () => {
      const customConfig: FSRSConfig = {
        requestRetention: 0.9,
        maximumInterval: 14,
        enableFuzz: true,
        enableShortTerm: false,
        examDate: '2024-01-22T00:00:00.000Z',
      };

      await saveFSRSConfig(db, 'profile1', customConfig);
      const config = await getFSRSConfig(db, 'profile1');

      expect(config.requestRetention).toBe(0.9);
      expect(config.maximumInterval).toBe(14);
      expect(config.enableFuzz).toBe(true);
      expect(config.enableShortTerm).toBe(false);
      expect(config.examDate).toBe('2024-01-22T00:00:00.000Z');
    });
  });

  describe('saveFSRSConfig', () => {
    it('should save config with profile id', async () => {
      const config: FSRSConfig = {
        requestRetention: 0.95,
        maximumInterval: 7,
        enableFuzz: false,
        enableShortTerm: true,
      };

      await saveFSRSConfig(db, 'profile1', config);

      const saved = await db.fsrsConfigs.get('profile1');
      expect(saved?.requestRetention).toBe(0.95);
    });

    it('should overwrite existing config', async () => {
      const config1: FSRSConfig = {
        requestRetention: 0.9,
        maximumInterval: 7,
        enableFuzz: false,
        enableShortTerm: true,
      };
      const config2: FSRSConfig = {
        requestRetention: 0.95,
        maximumInterval: 14,
        enableFuzz: true,
        enableShortTerm: false,
      };

      await saveFSRSConfig(db, 'profile1', config1);
      await saveFSRSConfig(db, 'profile1', config2);

      const config = await getFSRSConfig(db, 'profile1');
      expect(config.requestRetention).toBe(0.95);
      expect(config.maximumInterval).toBe(14);
    });
  });

  describe('migrateFromLocalStorage', () => {
    const now = new Date('2024-01-15T12:00:00.000Z');

    it('should migrate viewed questions to cards', async () => {
      const viewedQuestionIds = ['q1', 'q2', 'q3'];

      const count = await migrateFromLocalStorage(db, 'profile1', viewedQuestionIds, now);

      expect(count).toBe(3);

      const cards = await getCardsForProfile(db, 'profile1');
      expect(cards.length).toBe(3);

      // All migrated cards should have reps = 1
      for (const card of cards) {
        expect(card.reps).toBe(1);
      }
    });

    it('should not overwrite existing cards', async () => {
      // Create existing card
      const existingCard = await getOrCreateCard(db, 'profile1', 'q1', now);
      await updateCard(db, { ...existingCard, reps: 10 });

      const viewedQuestionIds = ['q1', 'q2'];
      const count = await migrateFromLocalStorage(db, 'profile1', viewedQuestionIds, now);

      expect(count).toBe(1); // Only q2 migrated

      const q1Card = await db.cards.get('profile1_q1');
      expect(q1Card?.reps).toBe(10); // Not overwritten
    });

    it('should return 0 for empty array', async () => {
      const count = await migrateFromLocalStorage(db, 'profile1', [], now);
      expect(count).toBe(0);
    });
  });

  describe('exportProfileData', () => {
    it('should export all profile data', async () => {
      const now = new Date('2024-01-15T12:00:00.000Z');

      // Create cards
      await getOrCreateCard(db, 'profile1', 'q1', now);
      await getOrCreateCard(db, 'profile1', 'q2', now);

      // Add review log
      await addReviewLog(db, {
        id: 'log1',
        profileId: 'profile1',
        questionId: 'q1',
        rating: FSRSRating.Good,
        reviewedAt: now.toISOString(),
        source: 'study',
      });

      // Save config
      const config: FSRSConfig = {
        requestRetention: 0.95,
        maximumInterval: 7,
        enableFuzz: false,
        enableShortTerm: true,
        examDate: '2024-01-22T00:00:00.000Z',
      };
      await saveFSRSConfig(db, 'profile1', config);

      const exported = await exportProfileData(db, 'profile1');

      expect(exported.cards.length).toBe(2);
      expect(exported.reviewLogs.length).toBe(1);
      expect(exported.config.examDate).toBe('2024-01-22T00:00:00.000Z');
    });
  });

  describe('importProfileData', () => {
    it('should import profile data', async () => {
      const now = new Date('2024-01-15T12:00:00.000Z');

      const data = {
        cards: [
          {
            id: 'old_q1',
            profileId: 'old',
            questionId: 'q1',
            state: CardState.Review,
            due: now.toISOString(),
            stability: 5,
            difficulty: 5,
            elapsedDays: 2,
            scheduledDays: 3,
            reps: 5,
            lapses: 1,
            lastReview: now.toISOString(),
          } as FSRSCard,
        ],
        reviewLogs: [
          {
            id: 'log1',
            profileId: 'old',
            questionId: 'q1',
            rating: FSRSRating.Good,
            reviewedAt: now.toISOString(),
            source: 'study' as const,
          },
        ],
        config: {
          requestRetention: 0.9,
          maximumInterval: 14,
          enableFuzz: true,
          enableShortTerm: false,
        },
      };

      await importProfileData(db, 'newprofile', data);

      // Check cards were imported with new profileId
      const cards = await getCardsForProfile(db, 'newprofile');
      expect(cards.length).toBe(1);
      expect(cards[0].profileId).toBe('newprofile');
      expect(cards[0].id).toBe('newprofile_q1');
      expect(cards[0].state).toBe(CardState.Review);

      // Check logs were imported
      const logs = await getReviewLogsForProfile(db, 'newprofile');
      expect(logs.length).toBe(1);
      expect(logs[0].profileId).toBe('newprofile');

      // Check config was imported
      const config = await getFSRSConfig(db, 'newprofile');
      expect(config.requestRetention).toBe(0.9);
    });
  });

  describe('clearProfileData', () => {
    it('should clear all data for a profile', async () => {
      const now = new Date('2024-01-15T12:00:00.000Z');

      // Create data for profile1
      await getOrCreateCard(db, 'profile1', 'q1', now);
      await addReviewLog(db, {
        id: 'log1',
        profileId: 'profile1',
        questionId: 'q1',
        rating: FSRSRating.Good,
        reviewedAt: now.toISOString(),
        source: 'study',
      });
      await saveFSRSConfig(db, 'profile1', { ...DEFAULT_FSRS_CONFIG });

      // Create data for profile2
      await getOrCreateCard(db, 'profile2', 'q1', now);

      // Clear profile1
      await clearProfileData(db, 'profile1');

      // Check profile1 data is cleared
      const cards1 = await getCardsForProfile(db, 'profile1');
      const logs1 = await getReviewLogsForProfile(db, 'profile1');
      expect(cards1.length).toBe(0);
      expect(logs1.length).toBe(0);

      // Check profile2 data is intact
      const cards2 = await getCardsForProfile(db, 'profile2');
      expect(cards2.length).toBe(1);
    });
  });

  describe('deleteDatabase', () => {
    it('should delete the entire database', async () => {
      const now = new Date('2024-01-15T12:00:00.000Z');
      await getOrCreateCard(db, 'profile1', 'q1', now);

      await deleteDatabase();

      // Create new database
      const newDb = createFSRSDatabase();
      await newDb.open();

      const cards = await getCardsForProfile(newDb, 'profile1');
      expect(cards.length).toBe(0);

      await newDb.delete();
    });
  });
});

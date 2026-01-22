/**
 * Dexie IndexedDB database for FSRS card storage.
 *
 * Uses IndexedDB for robust storage of FSRS cards and review logs,
 * segregated by user profile.
 */

import Dexie, { type EntityTable } from 'dexie';
import type { FSRSCard, FSRSConfig, FSRSReviewLog } from '@ham-exam/exam-core';
import { createNewCard, DEFAULT_FSRS_CONFIG } from '@ham-exam/exam-core';

/**
 * Database schema for FSRS data
 */
export interface FSRSDatabase extends Dexie {
  cards: EntityTable<FSRSCard, 'id'>;
  reviewLogs: EntityTable<FSRSReviewLog, 'id'>;
  fsrsConfigs: EntityTable<FSRSConfig & { id: string }, 'id'>;
}

/**
 * Create and initialize the FSRS database
 */
export function createFSRSDatabase(): FSRSDatabase {
  const db = new Dexie('ham-exam-fsrs') as FSRSDatabase;

  db.version(1).stores({
    cards: 'id, profileId, [profileId+due], [profileId+state]',
    reviewLogs: 'id, profileId, [profileId+reviewedAt]',
    fsrsConfigs: 'id',
  });

  return db;
}

// Singleton database instance
let dbInstance: FSRSDatabase | null = null;

/**
 * Get the database instance (creates if not exists)
 */
export function getDatabase(): FSRSDatabase {
  if (!dbInstance) {
    dbInstance = createFSRSDatabase();
  }
  return dbInstance;
}

/**
 * Reset the database instance (for testing)
 */
export function resetDatabase(): void {
  if (dbInstance) {
    dbInstance.close();
    dbInstance = null;
  }
}

/**
 * Get or create a card for a question
 */
export async function getOrCreateCard(
  db: FSRSDatabase,
  profileId: string,
  questionId: string,
  now: Date = new Date()
): Promise<FSRSCard> {
  const cardId = `${profileId}_${questionId}`;
  const existing = await db.cards.get(cardId);

  if (existing) {
    return existing;
  }

  const newCard = createNewCard(profileId, questionId, now);
  await db.cards.put(newCard);
  return newCard;
}

/**
 * Update a card in the database
 */
export async function updateCard(db: FSRSDatabase, card: FSRSCard): Promise<void> {
  await db.cards.put(card);
}

/**
 * Get all cards for a profile
 */
export async function getCardsForProfile(
  db: FSRSDatabase,
  profileId: string
): Promise<FSRSCard[]> {
  return db.cards.where('profileId').equals(profileId).toArray();
}

/**
 * Get cards that are due for a profile
 */
export async function getDueCardsForProfile(
  db: FSRSDatabase,
  profileId: string,
  now: Date = new Date()
): Promise<FSRSCard[]> {
  const cards = await getCardsForProfile(db, profileId);
  return cards.filter((card) => new Date(card.due).getTime() <= now.getTime());
}

/**
 * Add a review log entry
 */
export async function addReviewLog(
  db: FSRSDatabase,
  log: FSRSReviewLog
): Promise<void> {
  await db.reviewLogs.put(log);
}

/**
 * Get review logs for a profile
 */
export async function getReviewLogsForProfile(
  db: FSRSDatabase,
  profileId: string
): Promise<FSRSReviewLog[]> {
  return db.reviewLogs.where('profileId').equals(profileId).toArray();
}

/**
 * Get FSRS config for a profile
 */
export async function getFSRSConfig(
  db: FSRSDatabase,
  profileId: string
): Promise<FSRSConfig> {
  const config = await db.fsrsConfigs.get(profileId);
  if (config) {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...configWithoutId } = config;
    return configWithoutId;
  }
  return { ...DEFAULT_FSRS_CONFIG };
}

/**
 * Save FSRS config for a profile
 */
export async function saveFSRSConfig(
  db: FSRSDatabase,
  profileId: string,
  config: FSRSConfig
): Promise<void> {
  await db.fsrsConfigs.put({ ...config, id: profileId });
}

/**
 * Migrate existing study progress to FSRS cards
 */
export async function migrateFromLocalStorage(
  db: FSRSDatabase,
  profileId: string,
  viewedQuestionIds: string[],
  now: Date = new Date()
): Promise<number> {
  let migratedCount = 0;

  for (const questionId of viewedQuestionIds) {
    const cardId = `${profileId}_${questionId}`;
    const existing = await db.cards.get(cardId);

    if (!existing) {
      // Create card with 1 rep to indicate prior exposure
      const card = createNewCard(profileId, questionId, now);
      card.reps = 1;
      await db.cards.put(card);
      migratedCount++;
    }
  }

  return migratedCount;
}

/**
 * Export all FSRS data for a profile (for backup)
 */
export async function exportProfileData(
  db: FSRSDatabase,
  profileId: string
): Promise<{
  cards: FSRSCard[];
  reviewLogs: FSRSReviewLog[];
  config: FSRSConfig;
}> {
  const [cards, reviewLogs, config] = await Promise.all([
    getCardsForProfile(db, profileId),
    getReviewLogsForProfile(db, profileId),
    getFSRSConfig(db, profileId),
  ]);

  return { cards, reviewLogs, config };
}

/**
 * Import FSRS data for a profile (for restore)
 */
export async function importProfileData(
  db: FSRSDatabase,
  profileId: string,
  data: {
    cards: FSRSCard[];
    reviewLogs: FSRSReviewLog[];
    config: FSRSConfig;
  }
): Promise<void> {
  // Update profileId on all imported items to match current profile
  const cards = data.cards.map((card) => ({
    ...card,
    id: `${profileId}_${card.questionId}`,
    profileId,
  }));

  const reviewLogs = data.reviewLogs.map((log) => ({
    ...log,
    profileId,
  }));

  // Use transaction for atomicity
  await db.transaction('rw', [db.cards, db.reviewLogs, db.fsrsConfigs], async () => {
    await db.cards.bulkPut(cards);
    await db.reviewLogs.bulkPut(reviewLogs);
    await saveFSRSConfig(db, profileId, data.config);
  });
}

/**
 * Clear all FSRS data for a profile
 */
export async function clearProfileData(
  db: FSRSDatabase,
  profileId: string
): Promise<void> {
  await db.transaction('rw', [db.cards, db.reviewLogs, db.fsrsConfigs], async () => {
    await db.cards.where('profileId').equals(profileId).delete();
    await db.reviewLogs.where('profileId').equals(profileId).delete();
    await db.fsrsConfigs.delete(profileId);
  });
}

/**
 * Delete the entire database (for testing/reset)
 */
export async function deleteDatabase(): Promise<void> {
  resetDatabase();
  await Dexie.delete('ham-exam-fsrs');
}

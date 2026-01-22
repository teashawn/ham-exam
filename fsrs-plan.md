# FSRS Integration Plan for HAM Radio Exam App

## Overview

Integrate the FSRS (Free Spaced Repetition Scheduler) algorithm using `ts-fsrs` library to maximize learning efficiency for users preparing for their HAM radio license exam.

**Critical Constraint:** Users have exactly **7 days** before the exam - all algorithm parameters and UX decisions must optimize for this short-term intensive learning window.

---

## FSRS Parameters (Optimized for 7-Day Exam Prep)

```typescript
const examPrepConfig: FSRSConfig = {
  requestRetention: 0.95,        // High retention - exam is soon
  maximumInterval: 7,            // Cap intervals at exam date
  enableFuzz: false,             // No randomness in short window
  enableShortTerm: true,         // Enable intra-day learning steps
  learningSteps: ['1m', '10m', '1h', '4h'],   // Aggressive initial learning
  relearningSteps: ['5m', '30m', '2h'],       // Quick recovery for lapses
  examDate: '2026-01-29',        // Dynamic interval capping
};
```

**Why these parameters:**
- `maximumInterval: 7` - No point scheduling reviews after exam day
- `requestRetention: 0.95` - Higher than default (0.9) means more frequent reviews
- `enableFuzz: false` - Fuzzing could push cards past exam date
- Short learning steps - Rapid consolidation within single study sessions

---

## Architecture

### Package Structure

```
packages/
├── exam-core/
│   ├── src/
│   │   ├── types.ts        # MODIFY: Add FSRS types
│   │   ├── fsrs.ts         # NEW: FSRS service (platform-agnostic)
│   │   └── index.ts        # MODIFY: Export FSRS functions
│
└── web/
    ├── src/
    │   ├── lib/
    │   │   └── db.ts       # NEW: Dexie IndexedDB setup
    │   ├── hooks/
    │   │   └── useSRS.ts   # NEW: React hook for FSRS
    │   ├── components/
    │   │   ├── StudyHomeView.tsx      # MODIFY: Add due cards dashboard
    │   │   └── StudyGradeButtons.tsx  # NEW: Rating buttons
    │   └── App.tsx         # MODIFY: Wire up FSRS flow
```

### Data Flow

```
User Action (Study/Exam)
         │
         ▼
┌─────────────────────────┐
│  FSRS Service (exam-core)│
│  - calculateReview()     │
│  - Exam: correct→Good(3) │
│  - Exam: wrong→Again(1)  │
└───────────┬─────────────┘
            ▼
┌─────────────────────────┐
│  IndexedDB (Dexie)      │
│  - userCards table      │
│  - reviewLogs table     │
└─────────────────────────┘
```

---

## Implementation Phases

### Phase 1: Foundation (exam-core)

**1.1 Add FSRS Types** (`packages/exam-core/src/types.ts`)

```typescript
// New types to add
export enum CardState { New = 0, Learning = 1, Review = 2, Relearning = 3 }
export enum FSRSRating { Again = 1, Hard = 2, Good = 3, Easy = 4 }

export interface FSRSCard {
  id: string;                    // ${profileId}_${questionId}
  profileId: string;
  questionId: string;
  state: CardState;
  due: string;                   // ISO date
  stability: number;
  difficulty: number;
  elapsedDays: number;           // Days since last review
  scheduledDays: number;         // Days until next review
  reps: number;
  lapses: number;
  lastReview: string | null;
}

export interface FSRSReviewLog {
  id: string;
  profileId: string;
  questionId: string;
  rating: FSRSRating;
  reviewedAt: string;
  source: 'study' | 'exam';
}

export interface FSRSConfig {
  requestRetention: number;
  maximumInterval: number;
  enableFuzz: boolean;
  enableShortTerm: boolean;
  examDate?: string;
}
```

**1.2 Create FSRS Service** (`packages/exam-core/src/fsrs.ts`)

Core functions:
- `createNewCard(profileId, questionId)` - Initialize new card
- `calculateReview(card, rating, config)` - Schedule next review
- `examResultToRating(isCorrect)` - Map binary result to rating
- `getSchedulingPreview(card, config)` - Show intervals for each rating
- `sortCardsByUrgency(cards)` - Order by due date

**1.3 Add Dependency**

```bash
npm install ts-fsrs --workspace=packages/exam-core
```

---

### Phase 2: Storage Layer (web)

**2.1 Dexie Database Setup** (`packages/web/src/lib/db.ts`)

```typescript
// Tables
cards: 'id, profileId, [profileId+due], [profileId+state]'
reviewLogs: 'id, profileId, [profileId+reviewedAt]'
fsrsConfigs: 'id'  // Per-profile FSRS settings
```

Key functions:
- `getDueCards(profileId)` - Cards where due <= now
- `getOrCreateCard(profileId, questionId)` - Lazy card creation
- `updateCard(card)` - Save after review
- `migrateFromLocalStorage(profileId, viewedQuestionIds)` - Migration

**2.2 Add Dependencies**

```bash
npm install dexie dexie-react-hooks --workspace=packages/web
npm install -D fake-indexeddb --workspace=packages/web  # For tests
```

---

### Phase 3: React Integration (web)

**3.1 useSRS Hook** (`packages/web/src/hooks/useSRS.ts`)

```typescript
function useSRS({ profileId, questions }): {
  isLoading: boolean;
  config: FSRSConfig;
  dueCards: FSRSCard[];
  stats: { totalCards, newCards, learningCards, reviewCards, dueNow };

  reviewCard: (card, rating) => Promise<FSRSCard>;
  reviewFromExam: (questionId, isCorrect) => Promise<void>;
  getNextDueCard: () => FSRSCard | null;
  getSchedulePreview: (card) => Record<FSRSRating, { due, interval }>;
}
```

**3.2 Grade Buttons** (`packages/web/src/components/StudyGradeButtons.tsx`)

- 4 buttons: Again (1), Hard (2), Good (3), Easy (4)
- Shows next review interval under each button
- Bulgarian labels: "Не знаех" (Didn't know), "Трудно" (Hard), "Добре" (Good), "Лесно" (Easy)
- Keyboard shortcuts: 1, 2, 3, 4

---

### Phase 4: UI Updates (web)

**4.1 Study Home Dashboard** (modify `StudyHomeView.tsx`)

Add:
- Due cards count prominently displayed ("12 cards due now")
- Breakdown: New / Learning / Review
- Exam countdown: "7 days until exam"
- Progress visualization

**4.2 Exam Date Configuration** (modify config view)

Add to settings/config:
- Date picker for exam date
- Shows countdown: "X days until exam"
- Stored in FSRS config (IndexedDB)
- Default: 7 days from first use if not set

**4.3 Study Mode Flow** (modify `App.tsx`)

Current flow:
```
Show question → Show answer → Mark viewed → Next
```

New FSRS flow:
```
Show question → Think of answer → Reveal correct → Grade (1-4) → FSRS update → Next due card
```

Changes:
- Add "Show Answer" button (user thinks first, then reveals)
- Add 4 grade buttons after reveal with interval previews
- Use FSRS queue (due cards first) instead of linear progression
- Keyboard shortcuts: Space (reveal), 1-4 (grade)

**4.4 Exam Mode Integration** (modify `App.tsx`)

After each exam answer:
```typescript
// In handleExamAnswer
await srs.reviewFromExam(questionId, isCorrect);
// This updates FSRS state for the question
```

---

### Phase 5: Migration & Data Safety

**5.1 Existing Users Migration**

```typescript
// On app load, check for existing progress
const oldProgress = loadStudyProgress(userId);
if (oldProgress?.viewedQuestionIds.length > 0 && !migrationDone) {
  await srs.migrateProgress(oldProgress.viewedQuestionIds);
  markMigrationDone();
}
```

Migrated cards get `reps: 1` to indicate prior exposure.

**5.2 Storage Strategy**

- Keep localStorage for: user profile, exam history, exam config
- Use IndexedDB (Dexie) for: FSRS cards, review logs, FSRS config

**5.3 Data Export/Import** (from fsrs.md Section 5)

Add to settings:
- "Backup Progress" button → exports IndexedDB to JSON file
- "Restore Progress" button → imports JSON file into IndexedDB
- Allows users to move progress between devices (PC ↔ Mobile)

**5.4 Browser Privacy Warning**

Display notice in settings/first-run:
- "Your learning progress is stored in this browser only"
- "Clearing site data/cookies will erase your progress"
- "Use Backup to save your data"

---

## File Changes Summary

### New Files (8)

| File | Description |
|------|-------------|
| `packages/exam-core/src/fsrs.ts` | FSRS service wrapper |
| `packages/exam-core/src/fsrs.test.ts` | Service tests |
| `packages/web/src/lib/db.ts` | Dexie database |
| `packages/web/src/lib/db.test.ts` | Database tests |
| `packages/web/src/hooks/useSRS.ts` | React FSRS hook |
| `packages/web/src/hooks/useSRS.test.ts` | Hook tests |
| `packages/web/src/components/StudyGradeButtons.tsx` | Rating buttons |
| `packages/web/src/components/StudyGradeButtons.test.tsx` | Button tests |

### Modified Files (7)

| File | Changes |
|------|---------|
| `packages/exam-core/src/types.ts` | Add FSRS types |
| `packages/exam-core/src/index.ts` | Export FSRS functions |
| `packages/exam-core/package.json` | Add ts-fsrs |
| `packages/web/package.json` | Add dexie, dexie-react-hooks, fake-indexeddb |
| `packages/web/src/components/StudyHomeView.tsx` | Dashboard stats, exam countdown |
| `packages/web/src/components/ConfigView.tsx` | Exam date picker, backup/restore, privacy warning |
| `packages/web/src/App.tsx` | FSRS integration, study flow changes |

---

## Testing Strategy

- All new code requires 100% test coverage (project requirement)
- Use `fake-indexeddb` for IndexedDB mocking in tests
- Mock `ts-fsrs` for deterministic scheduling tests
- Test migration with sample localStorage data

---

## Verification Plan

1. **Unit Tests**: Run `npm test` - all tests pass with 100% coverage
2. **Manual Testing**:
   - Start fresh session - see "X new cards" on dashboard
   - Complete study session - cards get scheduled
   - Check exam mode updates FSRS state
   - Verify intervals respect exam date cap
   - Test backup/restore functionality
3. **Migration Test**:
   - Create old-style progress in localStorage
   - Load app - verify migration runs
   - Check cards appear in IndexedDB

---

## Design Decisions (Confirmed)

1. **Study Mode UX**: 4-button grading system
   - "Didn't know" (Again) / "Hard" / "Good" / "Easy"
   - Shows next review interval under each button
   - Keyboard shortcuts: 1, 2, 3, 4

2. **Exam Date**: User-configurable via settings
   - Add date picker to config/settings view
   - Algorithm dynamically caps all intervals at exam date
   - Default to 7 days from first login if not set

# Firebase Cross-Device Sync Implementation Plan

## Overview

Add cross-device sync capability to the HAM exam app using Firebase Firestore, allowing users to access their progress from any device.

## Prerequisites

- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Firebase CLI authenticated (`firebase login`)

---

## Phase 1: Firebase Project Setup

### 1.1 Create Firebase Project
- [ ] Run `firebase projects:create ham-exam-bg --display-name "Bulgarian HAM Exam"`
- [ ] Verify project created: `firebase projects:list`

### 1.2 Initialize Firebase in Repository
- [ ] Run `firebase init` in project root
- [ ] Select Firestore and configure
- [ ] Verify `firebase.json` and `firestore.rules` created

### 1.3 Enable Authentication (requires console)
- [ ] Open Firebase Console: `firebase open auth`
- [ ] Enable Google Sign-In provider
- [ ] Add authorized domain: `<username>.github.io`

### 1.4 Create Firestore Database
- [ ] Run `firebase init firestore` (if not done in 1.2)
- [ ] Deploy initial security rules: `firebase deploy --only firestore:rules`

**Verification:** `firebase projects:list` shows project, `firestore.rules` exists

---

## Phase 2: Security Rules & Access Control

### 2.1 Design Firestore Data Structure
- [ ] Document the schema in this file (see Data Structure section below)

### 2.2 Create Email Allowlist Collection
- [ ] Define `/allowedEmails/{email}` collection structure
- [ ] Create script or CLI command to add allowed emails

### 2.3 Implement Security Rules
- [ ] Write rules in `firestore.rules` that:
  - Require authentication for all operations
  - Check email against allowlist
  - Scope user data to their own UID
- [ ] Deploy rules: `firebase deploy --only firestore:rules`

### 2.4 Test Security Rules
- [ ] Use Firebase Emulator to test rules locally
- [ ] Verify unauthorized emails are rejected
- [ ] Verify users can only access their own data

**Verification:** Security rules deployed, emulator tests pass

---

## Phase 3: Firebase SDK Integration

### 3.1 Install Dependencies
- [ ] Add Firebase SDK to web package: `npm install firebase --workspace=packages/web`
- [ ] Verify package.json updated

### 3.2 Create Firebase Configuration
- [ ] Create `packages/web/src/lib/firebase.ts` with:
  - Firebase app initialization
  - Firestore instance export
  - Auth instance export
- [ ] Store config in environment variables or config file
- [ ] Add `.env.example` with required variables

### 3.3 Create Firebase Auth Hook
- [ ] Create `packages/web/src/hooks/useFirebaseAuth.ts`
- [ ] Implement Google Sign-In flow
- [ ] Handle auth state changes
- [ ] Expose: `user`, `signIn`, `signOut`, `loading`, `error`
- [ ] Write tests with 100% coverage

**Verification:** Can import Firebase, auth hook tests pass

---

## Phase 4: Sync Service Implementation

### 4.1 Create Sync Types
- [ ] Add sync-related types to `packages/exam-core/src/types.ts`:
  - `SyncStatus`: 'idle' | 'syncing' | 'error' | 'offline'
  - `SyncConflictResolution`: 'local' | 'remote' | 'merge'
  - `SyncableData`: interface for all syncable entities

### 4.2 Create Firestore Sync Adapter
- [ ] Create `packages/web/src/lib/firestore-sync.ts`
- [ ] Implement functions:
  - `uploadUserData(userId, data)` - push local to Firestore
  - `downloadUserData(userId)` - pull Firestore to local
  - `subscribeToChanges(userId, callback)` - real-time listener
  - `resolveConflicts(local, remote)` - merge strategy
- [ ] Write tests with 100% coverage

### 4.3 Implement Conflict Resolution Strategy
- [ ] Use `lastModified` timestamps on all syncable entities
- [ ] For FSRS cards: keep the one with more reviews (higher `reps`)
- [ ] For exam history: merge arrays, dedupe by `sessionId`
- [ ] For config: use most recent

### 4.4 Create Sync Hook
- [ ] Create `packages/web/src/hooks/useSync.ts`
- [ ] Implement:
  - Auto-sync on auth state change
  - Manual sync trigger
  - Sync status indicator
  - Error handling with retry
- [ ] Write tests with 100% coverage

**Verification:** Sync functions work in isolation, tests pass

---

## Phase 5: Storage Layer Modifications

### 5.1 Add Timestamps to Stored Data
- [ ] Add `lastModifiedAt: string` to:
  - `UserProfile`
  - `ExamHistoryEntry`
  - `ExamConfig`
  - `FSRSCard`
  - `FSRSConfig`
- [ ] Update all save functions to set timestamp
- [ ] Migrate existing data (add timestamp on first load)
- [ ] Update tests

### 5.2 Create Unified Storage Interface
- [ ] Create `packages/web/src/lib/unified-storage.ts`
- [ ] Wrap local storage + Firestore sync
- [ ] Expose same API as current storage
- [ ] Handle offline gracefully (queue changes)
- [ ] Write tests with 100% coverage

### 5.3 Update Existing Storage Consumers
- [ ] Audit all `storage.ts` usage in web package
- [ ] Replace with unified storage where appropriate
- [ ] Ensure backward compatibility for non-authenticated users

**Verification:** Existing functionality unchanged, tests pass

---

## Phase 6: UI Implementation

### 6.1 Create Auth UI Components
- [ ] Create `packages/web/src/components/GoogleSignInButton.tsx`
- [ ] Create `packages/web/src/components/SyncStatus.tsx`
- [ ] Create `packages/web/src/components/AccountMenu.tsx`
- [ ] Style with Tailwind, match existing design
- [ ] Write tests with 100% coverage

### 6.2 Integrate Auth into App Flow
- [ ] Add sign-in option to login/home screen
- [ ] Show sync status in header/footer
- [ ] Add account menu with:
  - Signed-in email display
  - Manual sync button
  - Sign out option
- [ ] Handle auth errors gracefully

### 6.3 Add Sync Feedback
- [ ] Show toast/notification on sync complete
- [ ] Show error state with retry option
- [ ] Show "offline" indicator when disconnected
- [ ] Update tests

**Verification:** Can sign in with Google, see sync status, sign out

---

## Phase 7: Testing & Quality Assurance

### 7.1 Unit Tests
- [ ] All new files have 100% coverage
- [ ] Run full test suite: `npm test`
- [ ] Verify coverage thresholds pass: `npm run test:coverage`

### 7.2 Integration Tests
- [ ] Test full sync flow with Firebase Emulator
- [ ] Test offline → online sync
- [ ] Test conflict resolution scenarios
- [ ] Test with multiple simulated users

### 7.3 Manual Testing
- [ ] Test on two different devices
- [ ] Test sign in → see existing data synced
- [ ] Test make changes → see on other device
- [ ] Test offline changes → sync when back online

**Verification:** All tests pass, manual QA checklist complete

---

## Phase 8: Documentation & Deployment

### 8.1 Update Documentation
- [ ] Update README with sync feature info
- [ ] Document Firebase setup for contributors
- [ ] Add troubleshooting section

### 8.2 Environment Configuration
- [ ] Set up GitHub Actions secrets for Firebase config
- [ ] Update build process if needed
- [ ] Verify GitHub Pages deployment works

### 8.3 Admin Documentation
- [ ] Document how to add allowed emails
- [ ] Document how to view/manage users in Firebase Console
- [ ] Create admin CLI commands if useful

**Verification:** Deployed to GitHub Pages, sync works in production

---

## Data Structure

### Firestore Collections

```
/allowedEmails/{email}
  - addedAt: timestamp
  - addedBy: string (admin email)

/users/{odingUserId}
  - odingUserId: string
  - email: string (read from Firebase Auth)
  - profile: {
      id: string
      name: string
      createdAt: timestamp
      lastActiveAt: timestamp
      lastModifiedAt: timestamp
    }
  - examConfig: {
      questionsPerSection: map
      shuffleQuestions: boolean
      lastModifiedAt: timestamp
    }
  - lastSyncedAt: timestamp

/users/{odingUserId}/examHistory/{sessionId}
  - sessionId: string
  - score: number
  - passed: boolean
  - totalQuestions: number
  - correctAnswers: number
  - completedAt: timestamp
  - config: map
  - lastModifiedAt: timestamp

/users/{odingUserId}/fsrsCards/{odingCardId}
  - (all FSRSCard fields)
  - lastModifiedAt: timestamp

/users/{odingUserId}/fsrsReviewLogs/{logId}
  - (all FSRSReviewLog fields)

/users/{odingUserId}/fsrsConfig
  - (all FSRSConfig fields)
  - lastModifiedAt: timestamp
```

### Security Rules Summary

```
- All reads/writes require auth
- Email must exist in /allowedEmails
- Users can only access /users/{uid} where uid matches their auth
- Allowlist is read-only (admin manages via CLI/Console)
```

---

## Progress Tracking

| Phase | Status | Started | Completed |
|-------|--------|---------|-----------|
| Phase 1: Firebase Setup | Not Started | - | - |
| Phase 2: Security Rules | Not Started | - | - |
| Phase 3: SDK Integration | Not Started | - | - |
| Phase 4: Sync Service | Not Started | - | - |
| Phase 5: Storage Layer | Not Started | - | - |
| Phase 6: UI Implementation | Not Started | - | - |
| Phase 7: Testing & QA | Not Started | - | - |
| Phase 8: Documentation | Not Started | - | - |

---

## Notes & Decisions

- **Auth Provider:** Google Sign-In (simplest UX, no password management)
- **Access Control:** Email allowlist in Firestore
- **Conflict Resolution:** Last-write-wins with timestamp, except FSRS cards use highest `reps`
- **Offline Support:** Local-first, sync when online
- **Backward Compatibility:** Non-authenticated users keep working with local-only storage

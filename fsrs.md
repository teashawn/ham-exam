This report outlines the technical implementation strategy for integrating the Free Spaced Repetition Scheduler (FSRS) into your React/TypeScript HAM radio study application.

### **Executive Summary**

The FSRS (Free Spaced Repetition Scheduler) algorithm has been selected as the optimal engine for this project. Unlike legacy algorithms (e.g., SuperMemo-2) that rely on static intervals, FSRS utilizes a continuous probability model based on **Retrievability (R)**. This feature is critical for your specific use case: it allows the system to mathematically account for "random" reviews that occur during **Exam Mode**, seamlessly integrating them into the **Study Mode** schedule without disrupting long-term memory optimization.

Given the constraints of a client-side-only architecture (GitHub Pages) and multi-user support, this implementation will utilize **IndexedDB** for robust, profile-segregated local storage.

---

### **1. Core Algorithm: FSRS Logic**

We will utilize the **`ts-fsrs`** library, a Type-Safe implementation of FSRS v4.5/v5. This library handles the complex differential equations required to calculate memory stability (`S`), difficulty (`D`), and retrievability (`R`).

#### **1.1 The Mathematical Advantage for Exam Mode**

The core conflict in your application is harmonizing **random practice** (Exam Mode) with **scheduled study** (Study Mode).

* **Legacy Problem:** Traditional algorithms assume you only review a card when it is "due." If a user sees a card 5 days early in a practice exam, the algorithm doesn't know how to adjust the next interval.
* **FSRS Solution:** FSRS calculates **Retrievability ()** at the exact moment of the review, regardless of when it was scheduled.
* If a user encounters a card in Exam Mode that was due in 10 days, FSRS calculates that  is high (e.g., 95%).
* Because the memory is still "fresh" ( is high), the stability increase will be marginal.
* If the user fails this card in Exam Mode, FSRS recognizes it as a "lapse" and heavily penalizes the stability.
* **Result:** You can treat *every* Exam Mode answer as a valid FSRS review event.



---

### **2. Data Architecture (Client-Side Persistence)**

Since the app is hosted on GitHub Pages with no backend, all data must persist in the user's browser. **localStorage** is insufficient due to size limits (5MB) and synchronous blocking performance. We will use **IndexedDB**.

**Recommended Library:** **`Dexie.js`**
It provides a clean, TypeScript-friendly wrapper around IndexedDB, supporting complex queries (e.g., "find all cards due before today for User A").

#### **2.1 Multi-User Support Strategy**

Since there is no server, "logging in" acts as a **Local Profile Selector**. You will use a `profileId` to segregate data within the same IndexedDB database.

#### **2.2 Database Schema**

```typescript
interface UserProfile {
  id: string; // UUID
  name: string; // e.g., "KI5XYZ" or "Study Profile 1"
  created: Date;
}

interface UserCard {
  id: string; // Composite Key: `${profileId}_${questionId}`
  profileId: string; // Foreign Key to UserProfile
  questionId: string; // e.g., "T1A01"
  state: number; // 0=New, 1=Learning, 2=Review, 3=Relearning
  due: Date; // The critical sorting field for Study Mode
  stability: number;
  difficulty: number;
  reps: number;
  lapses: number;
  last_review: Date;
}

interface ReviewLog {
  id: string; // UUID
  profileId: string;
  cardId: string;
  grade: number; // 1=Again, 2=Hard, 3=Good, 4=Easy
  review: Date;
}

```

---

### **3. Implementation Guide**

#### **Step 1: Dependency Setup**

Install the algorithm library and the database wrapper.

```bash
npm install ts-fsrs dexie uuid
npm install -D @types/uuid

```

#### **Step 2: Service Layer (The FSRS Wrapper)**

Create a service that abstracts the FSRS logic. This ensures your React components don't deal with raw math.

```typescript
// services/SRS.ts
import { FSRS, Card, Rating, createEmptyCard, generatorParameters } from 'ts-fsrs';

// Initialize FSRS with default parameters (proven to work well for general knowledge)
const params = generatorParameters({ enable_fuzzing: true });
const f = new FSRS(params);

export const SRSService = {
  /**
   * Called when a user sees a Question for the first time
   */
  createNewCard: (): Card => {
    return createEmptyCard();
  },

  /**
   * Called when a user answers a question in EITHER Study or Exam mode.
   * Maps binary Exam results (Pass/Fail) to FSRS ratings.
   */
  calculateReview: (card: Card, isCorrect: boolean) => {
    // Mapping Logic:
    // Correct -> Rating.Good (3)
    // Incorrect -> Rating.Again (1)
    // Note: 'Hard' and 'Easy' buttons can be offered in Study Mode, 
    // but Exam Mode typically only produces binary outcomes.
    const rating = isCorrect? Rating.Good : Rating.Again;
    
    // FSRS handles the scheduling math here
    // It automatically accounts for 'early' reviews in Exam Mode
    const schedulingCards = f.repeat(card, new Date());
    
    return schedulingCards[rating].card;
  }
};

```

#### **Step 3: Integrating "Study Mode"**

**Goal:** Present questions ordered by urgency.

1. **Query:** Fetch all `UserCards` where `profileId === activeUser` AND `due <= now`.
2. **Sort:** Order by `due` ascending (overdue items first).
3. **Batching:** If the user has 500 due cards, use **virtualization** (`react-window`) to render the list efficiently. Do not load 500 components into the DOM.
4. **Session:** When the user enters "Study Mode," fetch the first batch (e.g., 20 cards) into a React State queue.
5. **Execution:**
* User answers card.
* Call `SRSService.calculateReview(card, result)`.
* Update `UserCard` in IndexedDB.
* Remove from local queue.



#### **Step 4: Integrating "Exam Mode"**

**Goal:** Random selection that updates the scheduler in the background.

1. **Selection:** Randomly select 35 questions (weighted by FCC sub-element rules) from the static JSON question pool.
2. **Hydration:** For each selected question, check IndexedDB for an existing `UserCard`.
* *If exists:* Load current state (Stability, Difficulty, etc.).
* *If missing:* Generate a temp `New` card state (do not save yet).


3. **Execution (The Unified Log):**
* User answers Question X.
* **Crucial Step:** Regardless of whether the card was "due," pass it to `SRSService.calculateReview()`.
* FSRS will see the current timestamp.
* If the card was due next month (), FSRS increases stability slightly (scheduling it further out).
* If the card was overdue (), FSRS increases stability significantly.


* **Save:** Write the updated card state to IndexedDB immediately.



---

### **4. React Component Architecture**

#### **4.1 `useSRS` Hook**

Encapsulate the database interaction in a custom hook to keep components clean.

```typescript
// hooks/useSRS.ts
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db"; // Your Dexie instance

export function useDueCards(profileId: string) {
  // Automatically updates the component when the DB changes
  const dueCards = useLiveQuery(() => 
    db.userCards
     .where("profileId").equals(profileId)
     .and(card => card.due <= new Date())
     .toArray()
  );
  
  return dueCards??;
}

```

#### **4.2 Performance Optimization**

Since you are storing 10,000+ items (logs + cards) in the browser:

1. **Do not load the full history:** Only load the current `UserCard` state for active questions. Load `ReviewLog` data only for the "Stats/Progress" page.
2. **Worker Offloading (Optional):** If you find the FSRS math causes UI jank (unlikely with `ts-fsrs`, but possible on low-end mobile), move the `calculateReview` logic to a Web Worker.

---

### **5. Migration & Sync Note**

Since there is no backend:

1. **Data Export:** Implement a "Backup" button that dumps the IndexedDB contents to a JSON file. This allows users to move their progress between devices (e.g., PC to Mobile) by manually importing the file.
2. **Browser Privacy:** Warn users that clearing "Site Data/Cookies" will wipe their progress.

### **6. Summary of Engineering Tasks**

1. **Database:** Initialize `Dexie` with `User`, `Card`, `Log` tables.
2. **Profiles:** Create a simple "Login" screen that reads/writes to the `User` table.
3. **FSRS:** Implement `SRSService` using `ts-fsrs`.
4. **Integration:**
* Modify **Study Mode** to pull from DB `due` index.
* Modify **Exam Mode** to push results to DB via `SRSService`.


5. **UI:** Add visualization (e.g., "Next review in 4 days") so users trust the algorithm is working.
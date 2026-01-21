/**
 * Study mode engine implementation
 */

import type {
  ExamData,
  ExamQuestion,
  StudyConfig,
  StudyProgress,
  StudySession,
} from './types.js';
import { generateId } from './engine.js';

/**
 * Get all questions for a specific section or all sections
 * @param examData - The complete exam data
 * @param sectionNumber - Section number (0 = all sections)
 * @returns Array of exam questions
 */
export function getStudyQuestions(
  examData: ExamData,
  sectionNumber: number
): ExamQuestion[] {
  if (sectionNumber === 0) {
    // Return all questions from all sections
    return examData.sections.flatMap((section) => section.questions);
  }

  // Return questions from specific section
  const section = examData.sections.find(
    (s) => s.metadata.sectionNumber === sectionNumber
  );

  return section ? section.questions : [];
}

/**
 * Create a new study session
 */
export function createStudySession(
  examData: ExamData,
  config: StudyConfig,
  userId: string
): StudySession {
  const questions = getStudyQuestions(examData, config.sectionNumber);

  return {
    id: generateId(),
    userId,
    config,
    questions,
    viewedQuestions: new Set(),
    currentSectionNumber: config.sectionNumber === 0 ? 1 : config.sectionNumber,
    startedAt: new Date(),
    lastActiveAt: new Date(),
  };
}

/**
 * Mark a question as viewed
 */
export function markQuestionViewed(
  session: StudySession,
  questionId: string
): void {
  session.viewedQuestions.add(questionId);
  session.lastActiveAt = new Date();
}

/**
 * Get questions filtered by section from a study session
 */
export function getStudySectionQuestions(
  session: StudySession,
  examData: ExamData,
  sectionNumber: number
): ExamQuestion[] {
  const section = examData.sections.find(
    (s) => s.metadata.sectionNumber === sectionNumber
  );

  if (!section) {
    return [];
  }

  const sectionQuestionIds = new Set(section.questions.map((q) => q.id));
  return session.questions.filter((q) => sectionQuestionIds.has(q.id));
}

/**
 * Get study progress per section
 */
export function getStudyProgress(
  session: StudySession,
  examData: ExamData
): StudyProgress[] {
  return examData.sections.map((section) => {
    const sectionQuestions = getStudySectionQuestions(
      session,
      examData,
      section.metadata.sectionNumber
    );

    const viewedCount = sectionQuestions.filter((q) =>
      session.viewedQuestions.has(q.id)
    ).length;

    const total = sectionQuestions.length;

    return {
      sectionNumber: section.metadata.sectionNumber,
      sectionTitle: section.metadata.title,
      totalQuestions: total,
      viewedQuestions: viewedCount,
      percentage: total > 0 ? Math.round((viewedCount / total) * 100) : 0,
    };
  });
}

/**
 * Get total study progress across all sections
 */
export function getTotalStudyProgress(session: StudySession): {
  viewed: number;
  total: number;
  percentage: number;
} {
  const viewed = session.viewedQuestions.size;
  const total = session.questions.length;
  return {
    viewed,
    total,
    percentage: total > 0 ? Math.round((viewed / total) * 100) : 0,
  };
}

/**
 * Switch to a different section within a study session
 */
export function switchStudySection(
  session: StudySession,
  sectionNumber: number
): void {
  session.currentSectionNumber = sectionNumber;
  session.lastActiveAt = new Date();
}

/**
 * Load viewed questions into an existing session (for restoring progress)
 */
export function loadViewedQuestions(
  session: StudySession,
  questionIds: string[]
): void {
  for (const id of questionIds) {
    session.viewedQuestions.add(id);
  }
}

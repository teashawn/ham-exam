/**
 * Core exam engine implementation
 */

import type {
  AnswerLetter,
  ExamConfig,
  ExamData,
  ExamQuestion,
  ExamResult,
  ExamSection,
  ExamSession,
  SectionResult,
  UserAnswer,
} from './types.js';

/**
 * Generate a unique ID
 */
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

/**
 * Fisher-Yates shuffle algorithm
 */
export function shuffleArray<T>(array: T[]): T[] {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Select random questions from a section
 */
export function selectRandomQuestions(
  questions: ExamQuestion[],
  count: number
): ExamQuestion[] {
  if (count >= questions.length) {
    return shuffleArray(questions);
  }

  const shuffled = shuffleArray(questions);
  return shuffled.slice(0, count);
}

/**
 * Build exam questions based on configuration
 */
export function buildExamQuestions(
  examData: ExamData,
  config: ExamConfig
): ExamQuestion[] {
  const selectedQuestions: ExamQuestion[] = [];

  for (const section of examData.sections) {
    const sectionNum = section.metadata.sectionNumber;
    const questionsToSelect = config.questionsPerSection[sectionNum] || 0;

    if (questionsToSelect > 0) {
      const selected = selectRandomQuestions(
        section.questions,
        questionsToSelect
      );
      selectedQuestions.push(...selected);
    }
  }

  if (config.shuffleQuestions) {
    return shuffleArray(selectedQuestions);
  }

  return selectedQuestions;
}

/**
 * Create a new exam session
 */
export function createExamSession(
  examData: ExamData,
  config: ExamConfig,
  userId: string
): ExamSession {
  const questions = buildExamQuestions(examData, config);

  return {
    id: generateId(),
    userId,
    config,
    questions,
    answers: new Map(),
    startedAt: new Date(),
    completedAt: null,
  };
}

/**
 * Check if an answer is correct
 */
export function checkAnswer(
  question: ExamQuestion,
  selectedAnswer: AnswerLetter
): boolean {
  return question.correctAnswer === selectedAnswer;
}

/**
 * Record a user's answer to a question
 */
export function recordAnswer(
  session: ExamSession,
  questionId: string,
  selectedAnswer: AnswerLetter
): UserAnswer {
  const question = session.questions.find((q) => q.id === questionId);

  if (!question) {
    throw new Error(`Question ${questionId} not found in session`);
  }

  const isCorrect = checkAnswer(question, selectedAnswer);

  const answer: UserAnswer = {
    questionId,
    selectedAnswer,
    isCorrect,
    answeredAt: new Date(),
  };

  session.answers.set(questionId, answer);

  return answer;
}

/**
 * Calculate the score (percentage) from answers
 */
export function calculateScore(
  totalQuestions: number,
  correctAnswers: number
): number {
  if (totalQuestions === 0) return 0;
  return Math.round((correctAnswers / totalQuestions) * 100);
}

/**
 * Determine if exam is passed (75% threshold)
 */
export function isPassed(score: number): boolean {
  return score >= 75;
}

/**
 * Calculate section result
 */
export function calculateSectionResult(
  section: ExamSection,
  sessionQuestions: ExamQuestion[],
  answers: Map<string, UserAnswer>
): SectionResult {
  const sectionQuestionIds = new Set(
    section.questions.map((q) => q.id)
  );

  const questionsInExam = sessionQuestions.filter((q) =>
    sectionQuestionIds.has(q.id)
  );

  let correctAnswers = 0;
  for (const question of questionsInExam) {
    const answer = answers.get(question.id);
    if (answer?.isCorrect) {
      correctAnswers++;
    }
  }

  return {
    sectionNumber: section.metadata.sectionNumber,
    sectionTitle: section.metadata.title,
    totalQuestions: questionsInExam.length,
    correctAnswers,
    score: calculateScore(questionsInExam.length, correctAnswers),
  };
}

/**
 * Complete an exam session and calculate results
 */
export function completeExam(
  session: ExamSession,
  examData: ExamData
): ExamResult {
  session.completedAt = new Date();

  let totalCorrect = 0;
  let totalWrong = 0;
  let totalUnanswered = 0;

  for (const question of session.questions) {
    const answer = session.answers.get(question.id);
    if (!answer || answer.selectedAnswer === null) {
      totalUnanswered++;
    } else if (answer.isCorrect) {
      totalCorrect++;
    } else {
      totalWrong++;
    }
  }

  const score = calculateScore(session.questions.length, totalCorrect);

  // Calculate section results
  const sectionResults = examData.sections.map((section) =>
    calculateSectionResult(section, session.questions, session.answers)
  ).filter((result) => result.totalQuestions > 0);

  return {
    sessionId: session.id,
    userId: session.userId,
    totalQuestions: session.questions.length,
    correctAnswers: totalCorrect,
    wrongAnswers: totalWrong,
    unanswered: totalUnanswered,
    score,
    passed: isPassed(score),
    completedAt: session.completedAt,
    sectionResults,
  };
}

/**
 * Get the current progress of an exam session
 */
export function getExamProgress(session: ExamSession): {
  answered: number;
  total: number;
  percentage: number;
} {
  const answered = session.answers.size;
  const total = session.questions.length;
  return {
    answered,
    total,
    percentage: calculateScore(total, answered),
  };
}

/**
 * Get unanswered questions
 */
export function getUnansweredQuestions(session: ExamSession): ExamQuestion[] {
  return session.questions.filter((q) => !session.answers.has(q.id));
}

/**
 * Get questions by section from session
 */
export function getQuestionsBySection(
  session: ExamSession,
  examData: ExamData
): Map<number, ExamQuestion[]> {
  const result = new Map<number, ExamQuestion[]>();

  for (const section of examData.sections) {
    const sectionQuestionIds = new Set(section.questions.map((q) => q.id));
    const questionsInSection = session.questions.filter((q) =>
      sectionQuestionIds.has(q.id)
    );

    if (questionsInSection.length > 0) {
      result.set(section.metadata.sectionNumber, questionsInSection);
    }
  }

  return result;
}

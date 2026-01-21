import { describe, it, expect, beforeEach } from 'vitest';
import {
  buildExamQuestions,
  calculateScore,
  calculateSectionResult,
  checkAnswer,
  completeExam,
  createExamSession,
  generateId,
  getExamProgress,
  getQuestionsBySection,
  getUnansweredQuestions,
  isPassed,
  recordAnswer,
  selectRandomQuestions,
  shuffleArray,
} from './engine.js';
import type { ExamConfig, ExamData, ExamQuestion, ExamSection, ExamSession } from './types.js';

// Test fixtures
const createTestQuestion = (id: string, sectionNum: number): ExamQuestion => ({
  id: `s${sectionNum}-${id}`,
  number: parseInt(id),
  question: `Test question ${id}`,
  options: [
    { letter: 'А', text: 'Option A' },
    { letter: 'Б', text: 'Option B' },
    { letter: 'В', text: 'Option C' },
    { letter: 'Г', text: 'Option D' },
  ],
  correctAnswer: 'Б',
});

const createTestSection = (num: number, questionCount: number): ExamSection => ({
  metadata: {
    sectionNumber: num,
    title: `Section ${num}`,
    titleEn: `Section ${num} EN`,
    examClass: 'Test Class',
    lastUpdated: '2024-01-01',
    sourceFile: 'test.pdf',
  },
  questions: Array.from({ length: questionCount }, (_, i) =>
    createTestQuestion(`${i + 1}`, num)
  ),
});

const createTestExamData = (): ExamData => ({
  version: '1.0.0',
  extractedAt: '2024-01-01T00:00:00.000Z',
  sections: [
    createTestSection(1, 20),
    createTestSection(2, 15),
    createTestSection(3, 10),
  ],
});

describe('generateId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateId();
    const id2 = generateId();
    expect(id1).not.toBe(id2);
  });

  it('should generate string IDs', () => {
    const id = generateId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });
});

describe('shuffleArray', () => {
  it('should return array of same length', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(arr);
    expect(shuffled.length).toBe(arr.length);
  });

  it('should contain same elements', () => {
    const arr = [1, 2, 3, 4, 5];
    const shuffled = shuffleArray(arr);
    expect(shuffled.sort()).toEqual(arr.sort());
  });

  it('should not modify original array', () => {
    const arr = [1, 2, 3, 4, 5];
    const original = [...arr];
    shuffleArray(arr);
    expect(arr).toEqual(original);
  });

  it('should handle empty array', () => {
    const shuffled = shuffleArray([]);
    expect(shuffled).toEqual([]);
  });

  it('should handle single element', () => {
    const shuffled = shuffleArray([1]);
    expect(shuffled).toEqual([1]);
  });
});

describe('selectRandomQuestions', () => {
  it('should select correct number of questions', () => {
    const questions = Array.from({ length: 10 }, (_, i) =>
      createTestQuestion(`${i}`, 1)
    );
    const selected = selectRandomQuestions(questions, 5);
    expect(selected.length).toBe(5);
  });

  it('should return all questions if count >= length', () => {
    const questions = Array.from({ length: 5 }, (_, i) =>
      createTestQuestion(`${i}`, 1)
    );
    const selected = selectRandomQuestions(questions, 10);
    expect(selected.length).toBe(5);
  });

  it('should return shuffled order', () => {
    const questions = Array.from({ length: 5 }, (_, i) =>
      createTestQuestion(`${i}`, 1)
    );
    const selected = selectRandomQuestions(questions, 5);
    // All elements should be present
    expect(new Set(selected.map((q) => q.id))).toEqual(
      new Set(questions.map((q) => q.id))
    );
  });
});

describe('buildExamQuestions', () => {
  it('should select questions from each section', () => {
    const examData = createTestExamData();
    const config: ExamConfig = {
      questionsPerSection: { 1: 5, 2: 3, 3: 2 },
      shuffleQuestions: false,
      shuffleOptions: false,
    };

    const questions = buildExamQuestions(examData, config);
    expect(questions.length).toBe(10);
  });

  it('should respect questionsPerSection config', () => {
    const examData = createTestExamData();
    const config: ExamConfig = {
      questionsPerSection: { 1: 10, 2: 0, 3: 5 },
      shuffleQuestions: false,
      shuffleOptions: false,
    };

    const questions = buildExamQuestions(examData, config);
    expect(questions.length).toBe(15);

    // Check section distribution
    const section1Count = questions.filter((q) => q.id.startsWith('s1-')).length;
    const section2Count = questions.filter((q) => q.id.startsWith('s2-')).length;
    const section3Count = questions.filter((q) => q.id.startsWith('s3-')).length;

    expect(section1Count).toBe(10);
    expect(section2Count).toBe(0);
    expect(section3Count).toBe(5);
  });

  it('should shuffle questions when configured', () => {
    const examData = createTestExamData();
    const config: ExamConfig = {
      questionsPerSection: { 1: 5, 2: 5, 3: 5 },
      shuffleQuestions: true,
      shuffleOptions: false,
    };

    // Run multiple times to verify shuffling
    const results = new Set<string>();
    for (let i = 0; i < 10; i++) {
      const questions = buildExamQuestions(examData, config);
      results.add(questions.map((q) => q.id).join(','));
    }

    // With shuffling, we expect different orderings
    expect(results.size).toBeGreaterThan(1);
  });
});

describe('createExamSession', () => {
  it('should create session with correct properties', () => {
    const examData = createTestExamData();
    const config: ExamConfig = {
      questionsPerSection: { 1: 5 },
      shuffleQuestions: false,
      shuffleOptions: false,
    };

    const session = createExamSession(examData, config, 'user-123');

    expect(session.id).toBeTruthy();
    expect(session.userId).toBe('user-123');
    expect(session.config).toEqual(config);
    expect(session.questions.length).toBe(5);
    expect(session.answers.size).toBe(0);
    expect(session.startedAt).toBeInstanceOf(Date);
    expect(session.completedAt).toBeNull();
  });
});

describe('checkAnswer', () => {
  it('should return true for correct answer', () => {
    const question = createTestQuestion('1', 1);
    expect(checkAnswer(question, 'Б')).toBe(true);
  });

  it('should return false for wrong answer', () => {
    const question = createTestQuestion('1', 1);
    expect(checkAnswer(question, 'А')).toBe(false);
    expect(checkAnswer(question, 'В')).toBe(false);
    expect(checkAnswer(question, 'Г')).toBe(false);
  });
});

describe('recordAnswer', () => {
  let session: ExamSession;

  beforeEach(() => {
    const examData = createTestExamData();
    const config: ExamConfig = {
      questionsPerSection: { 1: 3 },
      shuffleQuestions: false,
      shuffleOptions: false,
    };
    session = createExamSession(examData, config, 'user-123');
  });

  it('should record correct answer', () => {
    const questionId = session.questions[0].id;
    const answer = recordAnswer(session, questionId, 'Б');

    expect(answer.questionId).toBe(questionId);
    expect(answer.selectedAnswer).toBe('Б');
    expect(answer.isCorrect).toBe(true);
    expect(answer.answeredAt).toBeInstanceOf(Date);
  });

  it('should record wrong answer', () => {
    const questionId = session.questions[0].id;
    const answer = recordAnswer(session, questionId, 'А');

    expect(answer.isCorrect).toBe(false);
  });

  it('should store answer in session', () => {
    const questionId = session.questions[0].id;
    recordAnswer(session, questionId, 'Б');

    expect(session.answers.has(questionId)).toBe(true);
  });

  it('should throw for invalid question ID', () => {
    expect(() => recordAnswer(session, 'invalid-id', 'А')).toThrow();
  });
});

describe('calculateScore', () => {
  it('should calculate percentage correctly', () => {
    expect(calculateScore(10, 10)).toBe(100);
    expect(calculateScore(10, 5)).toBe(50);
    expect(calculateScore(10, 7)).toBe(70);
    expect(calculateScore(10, 0)).toBe(0);
  });

  it('should round to nearest integer', () => {
    expect(calculateScore(3, 1)).toBe(33);
    expect(calculateScore(3, 2)).toBe(67);
  });

  it('should handle zero total', () => {
    expect(calculateScore(0, 0)).toBe(0);
  });
});

describe('isPassed', () => {
  it('should pass at 75% or higher', () => {
    expect(isPassed(75)).toBe(true);
    expect(isPassed(80)).toBe(true);
    expect(isPassed(100)).toBe(true);
  });

  it('should fail below 75%', () => {
    expect(isPassed(74)).toBe(false);
    expect(isPassed(50)).toBe(false);
    expect(isPassed(0)).toBe(false);
  });
});

describe('calculateSectionResult', () => {
  it('should calculate section result correctly', () => {
    const section = createTestSection(1, 10);
    const sessionQuestions = section.questions.slice(0, 5);
    const answers = new Map();

    // Answer 3 correctly
    for (let i = 0; i < 3; i++) {
      answers.set(sessionQuestions[i].id, {
        questionId: sessionQuestions[i].id,
        selectedAnswer: 'Б',
        isCorrect: true,
        answeredAt: new Date(),
      });
    }

    const result = calculateSectionResult(section, sessionQuestions, answers);

    expect(result.sectionNumber).toBe(1);
    expect(result.totalQuestions).toBe(5);
    expect(result.correctAnswers).toBe(3);
    expect(result.score).toBe(60);
  });
});

describe('completeExam', () => {
  it('should calculate complete exam results', () => {
    const examData = createTestExamData();
    const config: ExamConfig = {
      questionsPerSection: { 1: 4 },
      shuffleQuestions: false,
      shuffleOptions: false,
    };

    const session = createExamSession(examData, config, 'user-123');

    // Answer all 4 questions: 3 correct, 1 wrong
    recordAnswer(session, session.questions[0].id, 'Б'); // correct
    recordAnswer(session, session.questions[1].id, 'Б'); // correct
    recordAnswer(session, session.questions[2].id, 'Б'); // correct
    recordAnswer(session, session.questions[3].id, 'А'); // wrong

    const result = completeExam(session, examData);

    expect(result.totalQuestions).toBe(4);
    expect(result.correctAnswers).toBe(3);
    expect(result.wrongAnswers).toBe(1);
    expect(result.unanswered).toBe(0);
    expect(result.score).toBe(75);
    expect(result.passed).toBe(true);
    expect(result.completedAt).toBeInstanceOf(Date);
  });

  it('should count unanswered questions', () => {
    const examData = createTestExamData();
    const config: ExamConfig = {
      questionsPerSection: { 1: 4 },
      shuffleQuestions: false,
      shuffleOptions: false,
    };

    const session = createExamSession(examData, config, 'user-123');

    // Answer only 2 questions
    recordAnswer(session, session.questions[0].id, 'Б');
    recordAnswer(session, session.questions[1].id, 'Б');

    const result = completeExam(session, examData);

    expect(result.unanswered).toBe(2);
    expect(result.score).toBe(50);
    expect(result.passed).toBe(false);
  });
});

describe('getExamProgress', () => {
  it('should return correct progress', () => {
    const examData = createTestExamData();
    const config: ExamConfig = {
      questionsPerSection: { 1: 10 },
      shuffleQuestions: false,
      shuffleOptions: false,
    };

    const session = createExamSession(examData, config, 'user-123');

    expect(getExamProgress(session)).toEqual({
      answered: 0,
      total: 10,
      percentage: 0,
    });

    recordAnswer(session, session.questions[0].id, 'А');
    recordAnswer(session, session.questions[1].id, 'А');

    expect(getExamProgress(session)).toEqual({
      answered: 2,
      total: 10,
      percentage: 20,
    });
  });
});

describe('getUnansweredQuestions', () => {
  it('should return unanswered questions', () => {
    const examData = createTestExamData();
    const config: ExamConfig = {
      questionsPerSection: { 1: 5 },
      shuffleQuestions: false,
      shuffleOptions: false,
    };

    const session = createExamSession(examData, config, 'user-123');

    recordAnswer(session, session.questions[0].id, 'А');
    recordAnswer(session, session.questions[2].id, 'А');

    const unanswered = getUnansweredQuestions(session);
    expect(unanswered.length).toBe(3);
    expect(unanswered.map((q) => q.id)).not.toContain(session.questions[0].id);
    expect(unanswered.map((q) => q.id)).not.toContain(session.questions[2].id);
  });
});

describe('getQuestionsBySection', () => {
  it('should group session questions by section', () => {
    const examData = createTestExamData();
    const config: ExamConfig = {
      questionsPerSection: { 1: 3, 2: 2, 3: 1 },
      shuffleQuestions: false,
      shuffleOptions: false,
    };

    const session = createExamSession(examData, config, 'user-123');
    const questionsBySection = getQuestionsBySection(session, examData);

    expect(questionsBySection.size).toBe(3);
    expect(questionsBySection.get(1)?.length).toBe(3);
    expect(questionsBySection.get(2)?.length).toBe(2);
    expect(questionsBySection.get(3)?.length).toBe(1);
  });

  it('should not include sections with no questions', () => {
    const examData = createTestExamData();
    const config: ExamConfig = {
      questionsPerSection: { 1: 5, 2: 0, 3: 0 },
      shuffleQuestions: false,
      shuffleOptions: false,
    };

    const session = createExamSession(examData, config, 'user-123');
    const questionsBySection = getQuestionsBySection(session, examData);

    expect(questionsBySection.size).toBe(1);
    expect(questionsBySection.has(1)).toBe(true);
    expect(questionsBySection.has(2)).toBe(false);
    expect(questionsBySection.has(3)).toBe(false);
  });
});

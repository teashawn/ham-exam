import { describe, it, expect } from 'vitest';
import {
  generateId,
  shuffleArray,
  selectRandomQuestions,
  buildExamQuestions,
  createExamSession,
  checkAnswer,
  recordAnswer,
  calculateScore,
  isPassed,
  completeExam,
  getExamProgress,
} from './exam-engine';
import type { ExamConfig, ExamData, ExamQuestion, ExamSection } from '../types';

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
});

describe('selectRandomQuestions', () => {
  it('should select correct number of questions', () => {
    const questions = Array.from({ length: 10 }, (_, i) =>
      createTestQuestion(`${i}`, 1)
    );
    const selected = selectRandomQuestions(questions, 5);
    expect(selected.length).toBe(5);
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
});

describe('createExamSession', () => {
  it('should create session with correct properties', () => {
    const examData = createTestExamData();
    const config: ExamConfig = {
      questionsPerSection: { 1: 5 },
      shuffleQuestions: false,
      shuffleOptions: false,
    };

    const session = createExamSession(examData, config);

    expect(session.id).toBeTruthy();
    expect(session.questions.length).toBe(5);
    expect(session.answers.size).toBe(0);
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
  });
});

describe('recordAnswer', () => {
  it('should record answer in session', () => {
    const examData = createTestExamData();
    const config: ExamConfig = {
      questionsPerSection: { 1: 3 },
      shuffleQuestions: false,
      shuffleOptions: false,
    };
    const session = createExamSession(examData, config);

    const questionId = session.questions[0].id;
    const answer = recordAnswer(session, questionId, 'Б');

    expect(answer.isCorrect).toBe(true);
    expect(session.answers.has(questionId)).toBe(true);
  });
});

describe('calculateScore', () => {
  it('should calculate percentage correctly', () => {
    expect(calculateScore(10, 10)).toBe(100);
    expect(calculateScore(10, 5)).toBe(50);
    expect(calculateScore(10, 0)).toBe(0);
  });
});

describe('isPassed', () => {
  it('should pass at 75% or higher', () => {
    expect(isPassed(75)).toBe(true);
    expect(isPassed(80)).toBe(true);
  });

  it('should fail below 75%', () => {
    expect(isPassed(74)).toBe(false);
    expect(isPassed(50)).toBe(false);
  });
});

describe('completeExam', () => {
  it('should calculate exam results', () => {
    const examData = createTestExamData();
    const config: ExamConfig = {
      questionsPerSection: { 1: 4 },
      shuffleQuestions: false,
      shuffleOptions: false,
    };

    const session = createExamSession(examData, config);

    recordAnswer(session, session.questions[0].id, 'Б');
    recordAnswer(session, session.questions[1].id, 'Б');
    recordAnswer(session, session.questions[2].id, 'Б');
    recordAnswer(session, session.questions[3].id, 'А');

    const result = completeExam(session, examData);

    expect(result.totalQuestions).toBe(4);
    expect(result.correctAnswers).toBe(3);
    expect(result.wrongAnswers).toBe(1);
    expect(result.score).toBe(75);
    expect(result.passed).toBe(true);
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

    const session = createExamSession(examData, config);

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

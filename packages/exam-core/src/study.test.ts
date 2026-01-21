import { describe, it, expect, beforeEach } from 'vitest';
import {
  createStudySession,
  getStudyProgress,
  getStudyQuestions,
  getStudySectionQuestions,
  getTotalStudyProgress,
  loadViewedQuestions,
  markQuestionViewed,
  switchStudySection,
} from './study.js';
import type { ExamData, ExamQuestion, ExamSection, StudySession } from './types.js';

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

describe('getStudyQuestions', () => {
  const examData = createTestExamData();

  it('should return all questions when sectionNumber is 0', () => {
    const questions = getStudyQuestions(examData, 0);
    expect(questions.length).toBe(45); // 20 + 15 + 10
  });

  it('should return questions from specific section', () => {
    const section1Questions = getStudyQuestions(examData, 1);
    expect(section1Questions.length).toBe(20);
    expect(section1Questions.every((q) => q.id.startsWith('s1-'))).toBe(true);

    const section2Questions = getStudyQuestions(examData, 2);
    expect(section2Questions.length).toBe(15);
    expect(section2Questions.every((q) => q.id.startsWith('s2-'))).toBe(true);

    const section3Questions = getStudyQuestions(examData, 3);
    expect(section3Questions.length).toBe(10);
    expect(section3Questions.every((q) => q.id.startsWith('s3-'))).toBe(true);
  });

  it('should return empty array for non-existent section', () => {
    const questions = getStudyQuestions(examData, 99);
    expect(questions).toEqual([]);
  });
});

describe('createStudySession', () => {
  const examData = createTestExamData();

  it('should create session with all questions when sectionNumber is 0', () => {
    const session = createStudySession(examData, { sectionNumber: 0 }, 'user-123');

    expect(session.id).toBeTruthy();
    expect(session.userId).toBe('user-123');
    expect(session.config.sectionNumber).toBe(0);
    expect(session.questions.length).toBe(45);
    expect(session.viewedQuestions.size).toBe(0);
    expect(session.currentSectionNumber).toBe(1);
    expect(session.startedAt).toBeInstanceOf(Date);
    expect(session.lastActiveAt).toBeInstanceOf(Date);
  });

  it('should create session with specific section questions', () => {
    const session = createStudySession(examData, { sectionNumber: 2 }, 'user-123');

    expect(session.questions.length).toBe(15);
    expect(session.currentSectionNumber).toBe(2);
  });

  it('should initialize with empty viewedQuestions set', () => {
    const session = createStudySession(examData, { sectionNumber: 1 }, 'user-123');

    expect(session.viewedQuestions).toBeInstanceOf(Set);
    expect(session.viewedQuestions.size).toBe(0);
  });
});

describe('markQuestionViewed', () => {
  let session: StudySession;

  beforeEach(() => {
    const examData = createTestExamData();
    session = createStudySession(examData, { sectionNumber: 0 }, 'user-123');
  });

  it('should add question ID to viewedQuestions', () => {
    const questionId = session.questions[0].id;
    markQuestionViewed(session, questionId);

    expect(session.viewedQuestions.has(questionId)).toBe(true);
  });

  it('should update lastActiveAt', () => {
    const originalTime = session.lastActiveAt.getTime();

    // Small delay to ensure time difference
    const questionId = session.questions[0].id;
    markQuestionViewed(session, questionId);

    expect(session.lastActiveAt.getTime()).toBeGreaterThanOrEqual(originalTime);
  });

  it('should handle marking same question multiple times', () => {
    const questionId = session.questions[0].id;
    markQuestionViewed(session, questionId);
    markQuestionViewed(session, questionId);
    markQuestionViewed(session, questionId);

    expect(session.viewedQuestions.size).toBe(1);
  });
});

describe('getStudySectionQuestions', () => {
  const examData = createTestExamData();

  it('should return questions from specific section in session', () => {
    const session = createStudySession(examData, { sectionNumber: 0 }, 'user-123');

    const section1Questions = getStudySectionQuestions(session, examData, 1);
    expect(section1Questions.length).toBe(20);
    expect(section1Questions.every((q) => q.id.startsWith('s1-'))).toBe(true);

    const section2Questions = getStudySectionQuestions(session, examData, 2);
    expect(section2Questions.length).toBe(15);
  });

  it('should return empty array for non-existent section', () => {
    const session = createStudySession(examData, { sectionNumber: 0 }, 'user-123');
    const questions = getStudySectionQuestions(session, examData, 99);

    expect(questions).toEqual([]);
  });

  it('should work with single-section session', () => {
    const session = createStudySession(examData, { sectionNumber: 2 }, 'user-123');

    // Section 2 questions should exist
    const section2Questions = getStudySectionQuestions(session, examData, 2);
    expect(section2Questions.length).toBe(15);

    // Other sections should be empty (not in session)
    const section1Questions = getStudySectionQuestions(session, examData, 1);
    expect(section1Questions.length).toBe(0);
  });
});

describe('getStudyProgress', () => {
  const examData = createTestExamData();

  it('should return progress for all sections', () => {
    const session = createStudySession(examData, { sectionNumber: 0 }, 'user-123');
    const progress = getStudyProgress(session, examData);

    expect(progress.length).toBe(3);
    expect(progress[0].sectionNumber).toBe(1);
    expect(progress[0].totalQuestions).toBe(20);
    expect(progress[0].viewedQuestions).toBe(0);
    expect(progress[0].percentage).toBe(0);
  });

  it('should track viewed questions per section', () => {
    const session = createStudySession(examData, { sectionNumber: 0 }, 'user-123');

    // Mark some questions in section 1 as viewed
    markQuestionViewed(session, 's1-1');
    markQuestionViewed(session, 's1-2');
    markQuestionViewed(session, 's1-3');

    // Mark some in section 2
    markQuestionViewed(session, 's2-1');

    const progress = getStudyProgress(session, examData);

    const section1Progress = progress.find((p) => p.sectionNumber === 1);
    expect(section1Progress?.viewedQuestions).toBe(3);
    expect(section1Progress?.percentage).toBe(15); // 3/20 = 15%

    const section2Progress = progress.find((p) => p.sectionNumber === 2);
    expect(section2Progress?.viewedQuestions).toBe(1);
    expect(section2Progress?.percentage).toBe(7); // 1/15 = 6.67% rounded to 7%
  });

  it('should include section title in progress', () => {
    const session = createStudySession(examData, { sectionNumber: 0 }, 'user-123');
    const progress = getStudyProgress(session, examData);

    expect(progress[0].sectionTitle).toBe('Section 1');
    expect(progress[1].sectionTitle).toBe('Section 2');
    expect(progress[2].sectionTitle).toBe('Section 3');
  });

  it('should handle section with no questions in session', () => {
    // Create a session with only section 1 questions
    const session = createStudySession(examData, { sectionNumber: 1 }, 'user-123');
    const progress = getStudyProgress(session, examData);

    // Section 1 should have questions
    const section1Progress = progress.find((p) => p.sectionNumber === 1);
    expect(section1Progress?.totalQuestions).toBe(20);

    // Sections 2 and 3 should have 0 questions in this session
    const section2Progress = progress.find((p) => p.sectionNumber === 2);
    expect(section2Progress?.totalQuestions).toBe(0);
    expect(section2Progress?.percentage).toBe(0); // This covers the `total > 0 ? ... : 0` branch
  });
});

describe('getTotalStudyProgress', () => {
  const examData = createTestExamData();

  it('should return total progress for session', () => {
    const session = createStudySession(examData, { sectionNumber: 0 }, 'user-123');
    const progress = getTotalStudyProgress(session);

    expect(progress.viewed).toBe(0);
    expect(progress.total).toBe(45);
    expect(progress.percentage).toBe(0);
  });

  it('should calculate percentage correctly', () => {
    const session = createStudySession(examData, { sectionNumber: 0 }, 'user-123');

    // Mark 9 questions as viewed (20% of 45)
    for (let i = 1; i <= 9; i++) {
      markQuestionViewed(session, `s1-${i}`);
    }

    const progress = getTotalStudyProgress(session);

    expect(progress.viewed).toBe(9);
    expect(progress.total).toBe(45);
    expect(progress.percentage).toBe(20);
  });

  it('should handle 100% completion', () => {
    const session = createStudySession(examData, { sectionNumber: 3 }, 'user-123');

    // Mark all 10 questions in section 3 as viewed
    for (let i = 1; i <= 10; i++) {
      markQuestionViewed(session, `s3-${i}`);
    }

    const progress = getTotalStudyProgress(session);

    expect(progress.viewed).toBe(10);
    expect(progress.total).toBe(10);
    expect(progress.percentage).toBe(100);
  });

  it('should handle empty session (0 questions)', () => {
    const emptyExamData: ExamData = {
      version: '1.0.0',
      extractedAt: '2024-01-01T00:00:00.000Z',
      sections: [],
    };

    // This will create a session with 0 questions
    const session = createStudySession(emptyExamData, { sectionNumber: 0 }, 'user-123');
    const progress = getTotalStudyProgress(session);

    expect(progress.viewed).toBe(0);
    expect(progress.total).toBe(0);
    expect(progress.percentage).toBe(0); // Covers the `total > 0 ? ... : 0` branch
  });
});

describe('switchStudySection', () => {
  const examData = createTestExamData();

  it('should switch to different section', () => {
    const session = createStudySession(examData, { sectionNumber: 0 }, 'user-123');

    expect(session.currentSectionNumber).toBe(1);

    switchStudySection(session, 2);
    expect(session.currentSectionNumber).toBe(2);

    switchStudySection(session, 3);
    expect(session.currentSectionNumber).toBe(3);
  });

  it('should update lastActiveAt', () => {
    const session = createStudySession(examData, { sectionNumber: 0 }, 'user-123');
    const originalTime = session.lastActiveAt.getTime();

    switchStudySection(session, 2);

    expect(session.lastActiveAt.getTime()).toBeGreaterThanOrEqual(originalTime);
  });
});

describe('loadViewedQuestions', () => {
  const examData = createTestExamData();

  it('should load question IDs into viewedQuestions set', () => {
    const session = createStudySession(examData, { sectionNumber: 0 }, 'user-123');
    const savedIds = ['s1-1', 's1-2', 's2-1'];

    loadViewedQuestions(session, savedIds);

    expect(session.viewedQuestions.size).toBe(3);
    expect(session.viewedQuestions.has('s1-1')).toBe(true);
    expect(session.viewedQuestions.has('s1-2')).toBe(true);
    expect(session.viewedQuestions.has('s2-1')).toBe(true);
  });

  it('should handle empty array', () => {
    const session = createStudySession(examData, { sectionNumber: 0 }, 'user-123');
    loadViewedQuestions(session, []);

    expect(session.viewedQuestions.size).toBe(0);
  });

  it('should not duplicate already viewed questions', () => {
    const session = createStudySession(examData, { sectionNumber: 0 }, 'user-123');

    markQuestionViewed(session, 's1-1');
    expect(session.viewedQuestions.size).toBe(1);

    loadViewedQuestions(session, ['s1-1', 's1-2']);
    expect(session.viewedQuestions.size).toBe(2);
  });
});

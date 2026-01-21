import { describe, it, expect } from 'vitest';
import { DEFAULT_EXAM_CONFIG } from './types';

describe('types', () => {
  it('should re-export DEFAULT_EXAM_CONFIG from exam-core', () => {
    expect(DEFAULT_EXAM_CONFIG).toBeDefined();
    expect(DEFAULT_EXAM_CONFIG.questionsPerSection).toBeDefined();
    expect(DEFAULT_EXAM_CONFIG.shuffleQuestions).toBe(true);
  });
});

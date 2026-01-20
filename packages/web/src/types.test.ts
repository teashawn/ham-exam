import { describe, it, expect } from 'vitest';
import { DEFAULT_EXAM_CONFIG } from './types';

describe('types', () => {
  describe('DEFAULT_EXAM_CONFIG', () => {
    it('should have correct default questions per section', () => {
      expect(DEFAULT_EXAM_CONFIG.questionsPerSection[1]).toBe(20);
      expect(DEFAULT_EXAM_CONFIG.questionsPerSection[2]).toBe(10);
      expect(DEFAULT_EXAM_CONFIG.questionsPerSection[3]).toBe(10);
    });

    it('should have shuffleQuestions enabled by default', () => {
      expect(DEFAULT_EXAM_CONFIG.shuffleQuestions).toBe(true);
    });

    it('should have shuffleOptions disabled by default', () => {
      expect(DEFAULT_EXAM_CONFIG.shuffleOptions).toBe(false);
    });
  });
});

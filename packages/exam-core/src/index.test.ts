import { describe, it, expect } from 'vitest';
import * as examCore from './index.js';
import { DEFAULT_EXAM_CONFIG } from './index.js';

describe('index exports', () => {
  it('should export DEFAULT_EXAM_CONFIG', () => {
    expect(DEFAULT_EXAM_CONFIG).toBeDefined();
    expect(DEFAULT_EXAM_CONFIG.questionsPerSection).toBeDefined();
    expect(DEFAULT_EXAM_CONFIG.questionsPerSection[1]).toBe(20);
    expect(DEFAULT_EXAM_CONFIG.questionsPerSection[2]).toBe(10);
    expect(DEFAULT_EXAM_CONFIG.questionsPerSection[3]).toBe(10);
    expect(DEFAULT_EXAM_CONFIG.shuffleQuestions).toBe(true);
    expect(DEFAULT_EXAM_CONFIG.shuffleOptions).toBe(false);
  });

  it('should export all engine functions', () => {
    expect(examCore.generateId).toBeDefined();
    expect(examCore.shuffleArray).toBeDefined();
    expect(examCore.selectRandomQuestions).toBeDefined();
    expect(examCore.buildExamQuestions).toBeDefined();
    expect(examCore.createExamSession).toBeDefined();
    expect(examCore.checkAnswer).toBeDefined();
    expect(examCore.recordAnswer).toBeDefined();
    expect(examCore.calculateScore).toBeDefined();
    expect(examCore.isPassed).toBeDefined();
    expect(examCore.calculateSectionResult).toBeDefined();
    expect(examCore.completeExam).toBeDefined();
    expect(examCore.getExamProgress).toBeDefined();
    expect(examCore.getUnansweredQuestions).toBeDefined();
    expect(examCore.getQuestionsBySection).toBeDefined();
  });

  it('should export all storage functions', () => {
    expect(examCore.loadUserProfile).toBeDefined();
    expect(examCore.saveUserProfile).toBeDefined();
    expect(examCore.clearUserProfile).toBeDefined();
    expect(examCore.createUserProfile).toBeDefined();
    expect(examCore.updateLastActive).toBeDefined();
    expect(examCore.loadExamConfig).toBeDefined();
    expect(examCore.saveExamConfig).toBeDefined();
    expect(examCore.loadExamHistory).toBeDefined();
    expect(examCore.saveExamHistory).toBeDefined();
    expect(examCore.addToHistory).toBeDefined();
    expect(examCore.clearExamHistory).toBeDefined();
    expect(examCore.getUserHistory).toBeDefined();
    expect(examCore.calculateHistoryStats).toBeDefined();
  });
});

import { describe, it, expect } from 'vitest';
import * as extractor from './index.js';

describe('index exports', () => {
  it('should export all parser functions', () => {
    expect(extractor.isValidAnswerLetter).toBeDefined();
    expect(extractor.extractCorrectAnswer).toBeDefined();
    expect(extractor.removeAnswerFromQuestion).toBeDefined();
    expect(extractor.normalizeExtractedText).toBeDefined();
    expect(extractor.parseMetadata).toBeDefined();
    expect(extractor.parseOptions).toBeDefined();
    expect(extractor.parseQuestionBlock).toBeDefined();
    expect(extractor.splitIntoQuestionBlocks).toBeDefined();
    expect(extractor.parseCompleteQuestion).toBeDefined();
    expect(extractor.parsePdfText).toBeDefined();
    expect(extractor.generateQuestionId).toBeDefined();
  });

  it('should export all types', () => {
    // Type exports are verified at compile time
    // This test ensures the module can be imported
    expect(typeof extractor).toBe('object');
  });
});

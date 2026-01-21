/**
 * PDF Extractor module for Bulgarian HAM exam questions
 *
 * This module provides functionality to extract exam questions
 * from PDF documents and convert them to structured JSON data.
 */

// Types
export type {
  AnswerLetter,
  AnswerOption,
  ExamQuestion,
  ExamSectionMetadata,
  ExamSection,
  ExamData,
  ParsedQuestion,
  ParsedDocument,
} from './types.js';

// Parser functions
export {
  isValidAnswerLetter,
  extractCorrectAnswer,
  removeAnswerFromQuestion,
  normalizeExtractedText,
  parseMetadata,
  parseOptions,
  parseQuestionBlock,
  splitIntoQuestionBlocks,
  parseCompleteQuestion,
  parsePdfText,
  generateQuestionId,
} from './parser.js';

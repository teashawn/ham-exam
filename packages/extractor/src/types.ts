/**
 * Answer option letter (Bulgarian alphabet)
 */
export type AnswerLetter = 'А' | 'Б' | 'В' | 'Г';

/**
 * A single answer option
 */
export interface AnswerOption {
  letter: AnswerLetter;
  text: string;
}

/**
 * A complete exam question with all data
 */
export interface ExamQuestion {
  /** Unique identifier for the question */
  id: string;
  /** Original question number in the PDF */
  number: number;
  /** The question text */
  question: string;
  /** Array of 4 answer options */
  options: AnswerOption[];
  /** The correct answer letter */
  correctAnswer: AnswerLetter;
}

/**
 * Metadata about an exam section
 */
export interface ExamSectionMetadata {
  /** Section number (1, 2, or 3) */
  sectionNumber: number;
  /** Section title in Bulgarian */
  title: string;
  /** Section title translated to English */
  titleEn: string;
  /** Exam class (e.g., "Радиолюбителски клас 1") */
  examClass: string;
  /** Date when the syllabus was last updated */
  lastUpdated: string;
  /** Source PDF filename */
  sourceFile: string;
}

/**
 * Complete exam section with metadata and questions
 */
export interface ExamSection {
  metadata: ExamSectionMetadata;
  questions: ExamQuestion[];
}

/**
 * Complete exam data containing all sections
 */
export interface ExamData {
  /** Version of the data format */
  version: string;
  /** Date when data was extracted */
  extractedAt: string;
  /** All exam sections */
  sections: ExamSection[];
}

/**
 * Result of parsing a single question from text
 */
export interface ParsedQuestion {
  number: number;
  questionText: string;
  correctAnswer: AnswerLetter;
  options: AnswerOption[];
}

/**
 * Result of parsing a PDF document
 */
export interface ParsedDocument {
  metadata: ExamSectionMetadata;
  questions: ParsedQuestion[];
  errors: string[];
}

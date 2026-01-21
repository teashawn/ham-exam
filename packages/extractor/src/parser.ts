import type {
  AnswerLetter,
  AnswerOption,
  ParsedQuestion,
  ParsedDocument,
  ExamSectionMetadata,
} from './types.js';

const ANSWER_LETTERS: AnswerLetter[] = ['А', 'Б', 'В', 'Г'];

/**
 * Normalize text extracted from PDF by removing rendering artifacts.
 * - Removes newlines that are due to PDF line wrapping (not intentional breaks)
 * - Collapses multiple spaces into single spaces
 * - Preserves paragraph breaks (double newlines)
 */
export function normalizeExtractedText(text: string): string {
  // Step 1: Preserve intentional paragraph breaks by marking them
  let normalized = text.replace(/\n\s*\n/g, '<<PARAGRAPH>>');

  // Step 2: Replace single newlines with spaces
  // PDF line breaks within sentences should become spaces
  normalized = normalized.replace(/\n/g, ' ');

  // Step 3: Restore paragraph breaks
  normalized = normalized.replace(/<<PARAGRAPH>>/g, '\n\n');

  // Step 4: Collapse multiple spaces into single spaces
  normalized = normalized.replace(/  +/g, ' ');

  // Step 5: Clean up spaces around paragraph breaks
  normalized = normalized.replace(/ *\n\n */g, '\n\n');

  return normalized.trim();
}

/**
 * Check if a character is a valid Bulgarian answer letter
 */
export function isValidAnswerLetter(char: string): char is AnswerLetter {
  return ANSWER_LETTERS.includes(char as AnswerLetter);
}

/**
 * Extract the correct answer letter from a question text
 * The correct answer is in parentheses at the end, e.g., "(Б)"
 */
export function extractCorrectAnswer(questionText: string): AnswerLetter | null {
  // Match pattern like "(Б)", "( Б )", or "(Б)." at the end of the question
  // Allow optional period after closing parenthesis
  // Also match Latin look-alikes: A->А, B->В
  const match = questionText.match(/\(\s*([АБВГAB])\s*\)\.?\s*$/);
  if (match) {
    const letter = match[1];
    // Direct Cyrillic letters
    if (isValidAnswerLetter(letter)) {
      return letter;
    }
    // Map Latin to Cyrillic
    if (letter === 'A') return 'А';
    if (letter === 'B') return 'В'; // Latin B looks like Cyrillic В
  }
  return null;
}

/**
 * Remove the correct answer indicator from the question text
 */
export function removeAnswerFromQuestion(questionText: string): string {
  // Handle both "(Б)" and "(Б)." formats, including Latin look-alikes
  return questionText.replace(/\s*\(\s*[АБВГAB]\s*\)\.?\s*$/, '').trim();
}

/**
 * Parse the section metadata from the header text
 */
export function parseMetadata(
  text: string,
  sourceFile: string
): ExamSectionMetadata {
  // Extract section number and title
  // Pattern: "Раздел N – Title"
  const sectionMatch = text.match(/Раздел\s+(\d+)\s*[–-]\s*([^\n]+)/i);

  let sectionNumber = 0;
  let title = '';

  if (sectionMatch) {
    sectionNumber = parseInt(sectionMatch[1], 10);
    title = sectionMatch[2].trim();
  }

  // Extract exam class
  const classMatch = text.match(/Радиолюбителски\s+клас\s+(\d+)/i);
  const examClass = classMatch
    ? `Радиолюбителски клас ${classMatch[1]}`
    : 'Радиолюбителски клас 1';

  // Extract last updated date
  const dateMatch = text.match(/Актуализиран\s+конспект\s+([\d.]+\s*г\.?)/i);
  const lastUpdated = dateMatch ? dateMatch[1].trim() : '';

  // English titles mapping
  const titleEnMap: Record<number, string> = {
    1: 'Electrical Engineering and Radio Engineering',
    2: 'Codes and Amateur Radio Abbreviations. Rules and Procedures',
    3: 'Regulatory Framework',
  };

  return {
    sectionNumber,
    title,
    titleEn: titleEnMap[sectionNumber] || '',
    examClass,
    lastUpdated,
    sourceFile,
  };
}

/**
 * Normalize Latin letters that look like Cyrillic to actual Cyrillic
 * A (Latin) -> А (Cyrillic), B (Latin) -> Б (Cyrillic for option B position)
 */
function normalizeAnswerLetter(letter: string, position: number): AnswerLetter | null {
  // Direct Cyrillic letters
  if (isValidAnswerLetter(letter)) {
    return letter;
  }
  // Latin A -> Cyrillic А (only if it's the first option)
  if (letter === 'A' && position === 0) {
    return 'А';
  }
  // Latin B -> Cyrillic Б (only if it's the second option position)
  // Note: Latin B looks like Cyrillic В visually, but in option context it's usually meant to be Б
  if (letter === 'B') {
    return 'В'; // Latin B visually matches В
  }
  return null;
}

/**
 * Parse answer options from text
 * Options are formatted as "А. text;" or "А. text."
 */
export function parseOptions(text: string): AnswerOption[] {
  const options: AnswerOption[] = [];

  // Find all option letter positions
  // Match both Cyrillic (АБВГ) and Latin look-alikes (A, B)
  const letterPositions: Array<{ letter: AnswerLetter; startIndex: number; textStart: number }> = [];
  const letterRegex = /([АБВГAB])\.\s*/g;

  let match;
  let optionIndex = 0;
  while ((match = letterRegex.exec(text)) !== null) {
    const rawLetter = match[1];
    const letter = normalizeAnswerLetter(rawLetter, optionIndex);
    if (letter) {
      letterPositions.push({
        letter,
        startIndex: match.index, // Position of "А"
        textStart: match.index + match[0].length, // Position after "А. "
      });
      optionIndex++;
    }
  }

  // Extract text between each letter and the next
  for (let i = 0; i < letterPositions.length; i++) {
    const start = letterPositions[i].textStart;
    const end = i < letterPositions.length - 1
      ? letterPositions[i + 1].startIndex // Position of next "Б."
      : text.length;

    let optionText = text.slice(start, end).trim();

    // Clean up the option text - remove trailing semicolons and periods
    optionText = optionText.replace(/[;.]\s*$/, '').trim();

    // Normalize PDF artifacts (newlines and multiple spaces)
    optionText = normalizeExtractedText(optionText);

    if (optionText) {
      options.push({
        letter: letterPositions[i].letter,
        text: optionText,
      });
    }
  }

  return options;
}

/**
 * Parse a single question block into structured data
 */
export function parseQuestionBlock(
  questionNumber: number,
  questionText: string,
  optionsText: string
): ParsedQuestion | null {
  // Extract correct answer from question text
  const correctAnswer = extractCorrectAnswer(questionText);
  if (!correctAnswer) {
    return null;
  }

  // Clean question text and normalize PDF artifacts
  const cleanQuestion = normalizeExtractedText(removeAnswerFromQuestion(questionText));

  // Parse options
  const options = parseOptions(optionsText);

  if (options.length !== 4) {
    return null;
  }

  return {
    number: questionNumber,
    questionText: cleanQuestion,
    correctAnswer,
    options,
  };
}

/**
 * Split PDF text into individual question blocks
 */
export function splitIntoQuestionBlocks(
  text: string
): Array<{ number: number; content: string }> {
  const blocks: Array<{ number: number; content: string }> = [];

  // Match question numbers at the start of lines
  // Pattern: number followed by period and space
  const questionStartRegex = /^(\d+)\.\s+/gm;

  const matches: Array<{ index: number; number: number }> = [];
  let match;

  while ((match = questionStartRegex.exec(text)) !== null) {
    matches.push({
      index: match.index,
      number: parseInt(match[1], 10),
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index;
    const end = i < matches.length - 1 ? matches[i + 1].index : text.length;
    const content = text.slice(start, end).trim();

    blocks.push({
      number: matches[i].number,
      content,
    });
  }

  return blocks;
}

/**
 * Parse a complete question block content
 */
export function parseCompleteQuestion(
  questionNumber: number,
  content: string
): ParsedQuestion | null {
  // Remove the question number prefix
  const withoutNumber = content.replace(/^\d+\.\s*/, '');

  // Find where options start - look for the first "А." pattern
  const optionsStartMatch = withoutNumber.match(/\n\s*А\.\s/);

  if (!optionsStartMatch || optionsStartMatch.index === undefined) {
    return null;
  }

  const questionText = withoutNumber.slice(0, optionsStartMatch.index).trim();
  const optionsText = withoutNumber.slice(optionsStartMatch.index).trim();

  return parseQuestionBlock(questionNumber, questionText, optionsText);
}

/**
 * Parse the full PDF text and extract all questions
 */
export function parsePdfText(
  text: string,
  sourceFile: string
): ParsedDocument {
  const errors: string[] = [];
  const questions: ParsedQuestion[] = [];

  // Parse metadata from the beginning of the document
  const metadata = parseMetadata(text, sourceFile);

  // Split into question blocks
  const blocks = splitIntoQuestionBlocks(text);

  for (const block of blocks) {
    const parsed = parseCompleteQuestion(block.number, block.content);

    if (parsed) {
      questions.push(parsed);
    } else {
      errors.push(`Failed to parse question ${block.number}`);
    }
  }

  return {
    metadata,
    questions,
    errors,
  };
}

/**
 * Generate a unique question ID
 */
export function generateQuestionId(sectionNumber: number, questionNumber: number): string {
  return `s${sectionNumber}-q${questionNumber.toString().padStart(3, '0')}`;
}

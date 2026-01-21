import { describe, it, expect } from 'vitest';
import {
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

describe('normalizeExtractedText', () => {
  it('should remove single newlines from PDF line wrapping', () => {
    const text = 'This is a sentence that\ncontinues on the next line.';
    expect(normalizeExtractedText(text)).toBe('This is a sentence that continues on the next line.');
  });

  it('should preserve paragraph breaks (double newlines)', () => {
    const text = 'First paragraph.\n\nSecond paragraph.';
    expect(normalizeExtractedText(text)).toBe('First paragraph.\n\nSecond paragraph.');
  });

  it('should collapse multiple spaces into single spaces', () => {
    const text = 'This  has   multiple    spaces.';
    expect(normalizeExtractedText(text)).toBe('This has multiple spaces.');
  });

  it('should handle combined PDF artifacts', () => {
    const text = 'Как  се  нарича  енергията,  която  се  съхранява  в  електромагнитно  или \nелектростатично поле?';
    expect(normalizeExtractedText(text)).toBe('Как се нарича енергията, която се съхранява в електромагнитно или електростатично поле?');
  });

  it('should preserve paragraph breaks with whitespace around them', () => {
    const text = 'First paragraph.  \n\n  Second paragraph.';
    expect(normalizeExtractedText(text)).toBe('First paragraph.\n\nSecond paragraph.');
  });

  it('should handle text with no newlines or extra spaces', () => {
    const text = 'Normal text without issues.';
    expect(normalizeExtractedText(text)).toBe('Normal text without issues.');
  });

  it('should trim leading and trailing whitespace', () => {
    const text = '  Text with surrounding whitespace  ';
    expect(normalizeExtractedText(text)).toBe('Text with surrounding whitespace');
  });

  it('should handle multiple single newlines', () => {
    const text = 'Line one\nline two\nline three';
    expect(normalizeExtractedText(text)).toBe('Line one line two line three');
  });
});

describe('isValidAnswerLetter', () => {
  it('should return true for valid Bulgarian answer letters', () => {
    expect(isValidAnswerLetter('А')).toBe(true);
    expect(isValidAnswerLetter('Б')).toBe(true);
    expect(isValidAnswerLetter('В')).toBe(true);
    expect(isValidAnswerLetter('Г')).toBe(true);
  });

  it('should return false for invalid letters', () => {
    expect(isValidAnswerLetter('A')).toBe(false); // Latin A
    expect(isValidAnswerLetter('B')).toBe(false); // Latin B
    expect(isValidAnswerLetter('Д')).toBe(false); // Bulgarian Д (not in options)
    expect(isValidAnswerLetter('1')).toBe(false);
    expect(isValidAnswerLetter('')).toBe(false);
    expect(isValidAnswerLetter('АБ')).toBe(false);
  });
});

describe('extractCorrectAnswer', () => {
  it('should extract correct answer from question text', () => {
    expect(extractCorrectAnswer('What is the answer? (Б)')).toBe('Б');
    expect(extractCorrectAnswer('Question text (А)')).toBe('А');
    expect(extractCorrectAnswer('Question text (В)')).toBe('В');
    expect(extractCorrectAnswer('Question text (Г)')).toBe('Г');
  });

  it('should handle extra spaces in parentheses', () => {
    expect(extractCorrectAnswer('Question text ( Б )')).toBe('Б');
    expect(extractCorrectAnswer('Question text (  А  )')).toBe('А');
  });

  it('should handle trailing whitespace', () => {
    expect(extractCorrectAnswer('Question text (Б)  ')).toBe('Б');
    expect(extractCorrectAnswer('Question text (Б)\n')).toBe('Б');
  });

  it('should return null for invalid format', () => {
    expect(extractCorrectAnswer('Question without answer')).toBe(null);
    expect(extractCorrectAnswer('Question (X)')).toBe(null);
    expect(extractCorrectAnswer('Question (Б) extra text')).toBe(null);
    expect(extractCorrectAnswer('(Б) at start')).toBe(null);
  });

  it('should handle Latin A as correct answer', () => {
    expect(extractCorrectAnswer('Question text (A)')).toBe('А');
  });

  it('should handle Latin B as correct answer', () => {
    expect(extractCorrectAnswer('Question text (B)')).toBe('В');
  });

  it('should handle trailing period after parenthesis', () => {
    expect(extractCorrectAnswer('Question text (Б).')).toBe('Б');
    expect(extractCorrectAnswer('Question text (A).')).toBe('А');
  });
});

describe('removeAnswerFromQuestion', () => {
  it('should remove the answer indicator from question text', () => {
    expect(removeAnswerFromQuestion('What is the answer? (Б)')).toBe(
      'What is the answer?'
    );
    expect(removeAnswerFromQuestion('Question text (А)')).toBe('Question text');
  });

  it('should handle extra whitespace', () => {
    expect(removeAnswerFromQuestion('Question text  (Б)')).toBe('Question text');
    expect(removeAnswerFromQuestion('Question text (Б)  ')).toBe('Question text');
    expect(removeAnswerFromQuestion('Question text ( Б )')).toBe('Question text');
  });

  it('should not modify text without answer indicator', () => {
    expect(removeAnswerFromQuestion('Question without answer')).toBe(
      'Question without answer'
    );
  });

  it('should handle Latin letters in answer indicator', () => {
    expect(removeAnswerFromQuestion('Question text (A)')).toBe('Question text');
    expect(removeAnswerFromQuestion('Question text (B)')).toBe('Question text');
  });

  it('should handle trailing period after answer', () => {
    expect(removeAnswerFromQuestion('Question text (Б).')).toBe('Question text');
  });
});

describe('parseMetadata', () => {
  it('should parse section number and title', () => {
    const text = `Раздел 1 – Електротехника и радиотехника
Some other content`;
    const result = parseMetadata(text, 'test.pdf');

    expect(result.sectionNumber).toBe(1);
    expect(result.title).toBe('Електротехника и радиотехника');
    expect(result.sourceFile).toBe('test.pdf');
  });

  it('should parse section with hyphen instead of en-dash', () => {
    const text = `Раздел 2 - Кодове и съкращения`;
    const result = parseMetadata(text, 'test.pdf');

    expect(result.sectionNumber).toBe(2);
    expect(result.title).toBe('Кодове и съкращения');
  });

  it('should parse exam class', () => {
    const text = `Радиолюбителски клас 2
Раздел 1 – Test`;
    const result = parseMetadata(text, 'test.pdf');

    expect(result.examClass).toBe('Радиолюбителски клас 2');
  });

  it('should default to class 1 if not found', () => {
    const text = `Раздел 1 – Test`;
    const result = parseMetadata(text, 'test.pdf');

    expect(result.examClass).toBe('Радиолюбителски клас 1');
  });

  it('should parse last updated date', () => {
    const text = `Актуализиран конспект 01.01.2024 г.
Раздел 1 – Test`;
    const result = parseMetadata(text, 'test.pdf');

    expect(result.lastUpdated).toBe('01.01.2024 г.');
  });

  it('should map English titles for known sections', () => {
    expect(parseMetadata('Раздел 1 – Test', 'test.pdf').titleEn).toBe(
      'Electrical Engineering and Radio Engineering'
    );
    expect(parseMetadata('Раздел 2 – Test', 'test.pdf').titleEn).toBe(
      'Codes and Amateur Radio Abbreviations. Rules and Procedures'
    );
    expect(parseMetadata('Раздел 3 – Test', 'test.pdf').titleEn).toBe(
      'Regulatory Framework'
    );
    expect(parseMetadata('Раздел 4 – Test', 'test.pdf').titleEn).toBe('');
  });

  it('should handle missing section info', () => {
    const result = parseMetadata('No section info here', 'test.pdf');

    expect(result.sectionNumber).toBe(0);
    expect(result.title).toBe('');
  });
});

describe('parseOptions', () => {
  it('should parse standard options format', () => {
    const text = `А. First option; Б. Second option; В. Third option; Г. Fourth option.`;
    const options = parseOptions(text);

    expect(options).toHaveLength(4);
    expect(options[0]).toEqual({ letter: 'А', text: 'First option' });
    expect(options[1]).toEqual({ letter: 'Б', text: 'Second option' });
    expect(options[2]).toEqual({ letter: 'В', text: 'Third option' });
    expect(options[3]).toEqual({ letter: 'Г', text: 'Fourth option' });
  });

  it('should handle options with newlines', () => {
    const text = `А. First option;
Б. Second option;
В. Third option;
Г. Fourth option.`;
    const options = parseOptions(text);

    expect(options).toHaveLength(4);
    expect(options[0].letter).toBe('А');
    expect(options[1].letter).toBe('Б');
    expect(options[2].letter).toBe('В');
    expect(options[3].letter).toBe('Г');
  });

  it('should handle options without trailing punctuation', () => {
    const text = `А. First option Б. Second option В. Third option Г. Fourth option`;
    const options = parseOptions(text);

    expect(options).toHaveLength(4);
  });

  it('should trim whitespace from option text', () => {
    const text = `А.   First option  ; Б.  Second option  `;
    const options = parseOptions(text);

    expect(options[0].text).toBe('First option');
    expect(options[1].text).toBe('Second option');
  });

  it('should return empty array for invalid format', () => {
    const options = parseOptions('No options here');
    expect(options).toHaveLength(0);
  });

  it('should handle Latin A at first position', () => {
    const text = `A. First option; Б. Second option; В. Third option; Г. Fourth option.`;
    const options = parseOptions(text);

    expect(options).toHaveLength(4);
    expect(options[0]).toEqual({ letter: 'А', text: 'First option' });
  });

  it('should handle Latin B in options', () => {
    const text = `А. First option; B. Second option; В. Third option; Г. Fourth option.`;
    const options = parseOptions(text);

    expect(options).toHaveLength(4);
    expect(options[1]).toEqual({ letter: 'В', text: 'Second option' });
  });

  it('should skip Latin A if not at first position', () => {
    // Latin A at position 1 should not be converted
    const text = `Б. First option; A. Second option`;
    const options = parseOptions(text);

    // Only Б should be parsed, A at wrong position is ignored
    expect(options).toHaveLength(1);
    expect(options[0].letter).toBe('Б');
  });
});

describe('parseQuestionBlock', () => {
  it('should parse a complete question block', () => {
    const questionText = 'What is 2 + 2? (Б)';
    const optionsText = 'А. 3; Б. 4; В. 5; Г. 6.';

    const result = parseQuestionBlock(1, questionText, optionsText);

    expect(result).not.toBe(null);
    expect(result!.number).toBe(1);
    expect(result!.questionText).toBe('What is 2 + 2?');
    expect(result!.correctAnswer).toBe('Б');
    expect(result!.options).toHaveLength(4);
  });

  it('should return null if no correct answer found', () => {
    const result = parseQuestionBlock(1, 'Question without answer', 'А. 1; Б. 2; В. 3; Г. 4.');
    expect(result).toBe(null);
  });

  it('should return null if not exactly 4 options', () => {
    const result = parseQuestionBlock(1, 'Question (А)', 'А. 1; Б. 2.');
    expect(result).toBe(null);
  });
});

describe('splitIntoQuestionBlocks', () => {
  it('should split text into question blocks', () => {
    const text = `1. First question? (А)
А. Option 1; Б. Option 2; В. Option 3; Г. Option 4.

2. Second question? (Б)
А. Option A; Б. Option B; В. Option C; Г. Option D.`;

    const blocks = splitIntoQuestionBlocks(text);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].number).toBe(1);
    expect(blocks[1].number).toBe(2);
    expect(blocks[0].content).toContain('First question');
    expect(blocks[1].content).toContain('Second question');
  });

  it('should handle non-sequential question numbers', () => {
    const text = `5. Question five? (А)
А. 1; Б. 2; В. 3; Г. 4.

10. Question ten? (Б)
А. A; Б. B; В. C; Г. D.`;

    const blocks = splitIntoQuestionBlocks(text);

    expect(blocks).toHaveLength(2);
    expect(blocks[0].number).toBe(5);
    expect(blocks[1].number).toBe(10);
  });

  it('should return empty array for text without questions', () => {
    const blocks = splitIntoQuestionBlocks('No questions here');
    expect(blocks).toHaveLength(0);
  });
});

describe('parseCompleteQuestion', () => {
  it('should parse a complete question from raw content', () => {
    const content = `1. Как се нарича електрически ток, при който
големината и посоката му не се променят с
времето? (Б)
А. Пулсиращ; Б. Постоянен; В. Променлив; Г. Синусоидален.`;

    const result = parseCompleteQuestion(1, content);

    expect(result).not.toBe(null);
    expect(result!.number).toBe(1);
    expect(result!.correctAnswer).toBe('Б');
    expect(result!.options).toHaveLength(4);
    expect(result!.questionText).toContain('Как се нарича електрически ток');
  });

  it('should return null if options not found', () => {
    const content = `1. Question without options (Б)`;
    const result = parseCompleteQuestion(1, content);
    expect(result).toBe(null);
  });

  it('should handle multiline questions', () => {
    const content = `1. This is a very long question
that spans multiple lines
and continues here? (А)
А. Option 1; Б. Option 2; В. Option 3; Г. Option 4.`;

    const result = parseCompleteQuestion(1, content);

    expect(result).not.toBe(null);
    expect(result!.questionText).toContain('This is a very long question');
    expect(result!.questionText).toContain('that spans multiple lines');
  });
});

describe('parsePdfText', () => {
  it('should parse complete PDF text', () => {
    const text = `Раздел 1 – Електротехника
Радиолюбителски клас 1

1. First question? (А)
А. Option 1; Б. Option 2; В. Option 3; Г. Option 4.

2. Second question? (Б)
А. Option A; Б. Option B; В. Option C; Г. Option D.`;

    const result = parsePdfText(text, 'test.pdf');

    expect(result.metadata.sectionNumber).toBe(1);
    expect(result.metadata.sourceFile).toBe('test.pdf');
    expect(result.questions).toHaveLength(2);
    expect(result.errors).toHaveLength(0);
  });

  it('should collect errors for unparseable questions', () => {
    const text = `Раздел 1 – Test

1. Good question? (А)
А. 1; Б. 2; В. 3; Г. 4.

2. Bad question without answer
А. 1; Б. 2; В. 3; Г. 4.

3. Another good question? (В)
А. 1; Б. 2; В. 3; Г. 4.`;

    const result = parsePdfText(text, 'test.pdf');

    expect(result.questions).toHaveLength(2);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0]).toContain('question 2');
  });

  it('should handle empty text', () => {
    const result = parsePdfText('', 'empty.pdf');

    expect(result.questions).toHaveLength(0);
    expect(result.metadata.sourceFile).toBe('empty.pdf');
  });
});

describe('generateQuestionId', () => {
  it('should generate correct question IDs', () => {
    expect(generateQuestionId(1, 1)).toBe('s1-q001');
    expect(generateQuestionId(1, 42)).toBe('s1-q042');
    expect(generateQuestionId(2, 100)).toBe('s2-q100');
    expect(generateQuestionId(3, 5)).toBe('s3-q005');
  });

  it('should pad question numbers to 3 digits', () => {
    expect(generateQuestionId(1, 1)).toBe('s1-q001');
    expect(generateQuestionId(1, 10)).toBe('s1-q010');
    expect(generateQuestionId(1, 100)).toBe('s1-q100');
  });
});

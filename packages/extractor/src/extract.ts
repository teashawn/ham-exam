#!/usr/bin/env tsx
/**
 * PDF Extraction Script
 *
 * Extracts exam questions from PDF files and saves them as JSON.
 *
 * Usage:
 *   npm run extract
 *   tsx src/extract.ts
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import pdfParse from 'pdf-parse';
import { parsePdfText, generateQuestionId } from './parser.js';
import type { ExamData, ExamSection, ExamQuestion } from './types.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// PDF files to process
const PDF_FILES = [
  'class_1_razdel_1.pdf',
  'class_1_razdel_2.pdf',
  'class_1_razdel_3.pdf',
];

// Paths
const DOCS_DIR = join(__dirname, '../../../docs');
const OUTPUT_DIR = join(__dirname, '../../../src/data');

/**
 * Extract text from a PDF file
 */
async function extractPdfText(filePath: string): Promise<string> {
  const buffer = readFileSync(filePath);
  const data = await pdfParse(buffer);
  return data.text;
}

/**
 * Process a single PDF file and return an ExamSection
 */
async function processPdfFile(filename: string): Promise<ExamSection> {
  const filePath = join(DOCS_DIR, filename);
  console.log(`Processing: ${filename}`);

  // Extract text from PDF
  const text = await extractPdfText(filePath);

  // Parse the text
  const parsed = parsePdfText(text, filename);

  // Log parsing results
  console.log(`  Section: ${parsed.metadata.sectionNumber} - ${parsed.metadata.title}`);
  console.log(`  Questions found: ${parsed.questions.length}`);

  if (parsed.errors.length > 0) {
    console.log(`  Errors: ${parsed.errors.length}`);
    parsed.errors.forEach((err) => console.log(`    - ${err}`));
  }

  // Convert ParsedQuestion to ExamQuestion with IDs
  const questions: ExamQuestion[] = parsed.questions.map((q) => ({
    id: generateQuestionId(parsed.metadata.sectionNumber, q.number),
    number: q.number,
    question: q.questionText,
    options: q.options,
    correctAnswer: q.correctAnswer,
  }));

  return {
    metadata: parsed.metadata,
    questions,
  };
}

/**
 * Main extraction function
 */
async function main(): Promise<void> {
  console.log('HAM Exam PDF Extraction\n');
  console.log('='.repeat(50));

  // Ensure output directory exists
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  // Process all PDF files
  const sections: ExamSection[] = [];

  for (const filename of PDF_FILES) {
    try {
      const section = await processPdfFile(filename);
      sections.push(section);
      console.log('');
    } catch (error) {
      console.error(`Error processing ${filename}:`, error);
      process.exit(1);
    }
  }

  // Create the complete exam data
  const examData: ExamData = {
    version: '1.0.0',
    extractedAt: new Date().toISOString(),
    sections,
  };

  // Calculate total questions
  const totalQuestions = sections.reduce(
    (sum, section) => sum + section.questions.length,
    0
  );

  // Write combined output
  const outputPath = join(OUTPUT_DIR, 'exam-questions.json');
  writeFileSync(outputPath, JSON.stringify(examData, null, 2), 'utf-8');

  console.log('='.repeat(50));
  console.log('Extraction Complete!\n');
  console.log(`Total sections: ${sections.length}`);
  console.log(`Total questions: ${totalQuestions}`);
  console.log(`Output: ${outputPath}`);

  // Also write individual section files for convenience
  for (const section of sections) {
    const sectionPath = join(
      OUTPUT_DIR,
      `section-${section.metadata.sectionNumber}.json`
    );
    writeFileSync(sectionPath, JSON.stringify(section, null, 2), 'utf-8');
    console.log(`Section ${section.metadata.sectionNumber}: ${sectionPath}`);
  }
}

// Run the extraction
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

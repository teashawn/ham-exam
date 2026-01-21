# Bulgarian HAM Radio License Exam Practice

A comprehensive study tool for students preparing for the Bulgarian Level 1 HAM (Amateur Radio) Certificate Exam. This application extracts questions from official PDF study materials and provides an interactive practice environment.

## Overview

This monorepo contains three packages that work together to provide a complete exam practice solution:

- **@ham-exam/extractor** - PDF parsing and question extraction
- **@ham-exam/exam-core** - Platform-agnostic exam engine with scoring and session management
- **@ham-exam/web** - React-based web application for exam practice

## Features

### Exam Practice
- 374 questions across 3 exam sections:
  - Section 1: 226 questions (Electrical Engineering and Radio Engineering)
  - Section 2: 92 questions (Codes and Amateur Radio Abbreviations, Rules and Procedures)
  - Section 3: 56 questions (Regulatory Framework)
- Configurable exam sessions with customizable questions per section
- Real-time progress tracking and detailed results with section breakdowns
- 75% passing threshold matching official exam requirements

### Study Mode
- Interactive review of all questions with correct answers displayed
- Visual question grid showing viewed/unviewed/current question status
- Progress tracking with milestone celebrations (25%, 50%, 75%, 100%)
- Persistent study progress saved automatically
- Keyboard navigation:
  - Arrow keys (← →) to navigate between questions
  - Number keys (1-3) to switch sections
  - 'G' to toggle grid view
  - 'Esc' to exit study mode

### User Experience
- User profile management and exam history tracking
- Statistics dashboard with pass rate, average score, and best score
- Dark/light theme with persistent preference
- Modern, responsive UI built with React, TypeScript, Tailwind CSS, and shadcn/ui

### Data Extraction
- Extract and parse Bulgarian HAM exam questions (Cyrillic alphabet)
- Handle edge cases: Latin/Cyrillic letter mixing, trailing periods, PDF rendering artifacts
- Comprehensive test coverage across all packages

## Project Structure

```
ham-exam/
├── packages/
│   ├── extractor/        # PDF parsing and extraction logic
│   ├── exam-core/        # Core exam engine (platform-agnostic)
│   └── web/              # React web application
├── src/data/             # Extracted exam data (JSON)
│   ├── section-1.json    # Electrical Engineering
│   ├── section-2.json    # Codes and Abbreviations
│   └── section-3.json    # Regulatory Framework
└── docs/                 # Source PDF study materials
```

## Getting Started

### Prerequisites

- Node.js 20 or higher
- npm 10 or higher

### Installation

Clone the repository and install dependencies:

```bash
git clone https://github.com/teashawn/ham-exam.git
cd ham-exam
npm install
```

This will install dependencies for all packages in the monorepo.

### Running the Web Application

Start the development server:

```bash
npm run dev
```

The application will be available at `http://localhost:5173`.

### Building for Production

Build the web application:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

### Extracting Questions from PDFs

To re-extract questions from the PDF source files:

```bash
npm run extract
```

This will parse the PDFs in the `docs/` directory and update the JSON data files in `src/data/`.

## Development

### Running Tests

Run tests for all packages:

```bash
npm test
```

Run tests for a specific package:

```bash
npm run test:extractor
npm run test:exam-core
npm run test:web
```

Run tests with coverage:

```bash
npm run test:coverage --workspace=packages/extractor
npm run test:coverage --workspace=packages/exam-core
npm run test:coverage --workspace=packages/web
```

### Building Packages

Build the exam-core and extractor packages:

```bash
npm run build:packages
```

## Package Details

### @ham-exam/extractor

PDF extraction module that parses Bulgarian HAM exam PDFs and outputs structured JSON data.

**Key features:**
- Handles Cyrillic alphabet with Latin character fallbacks
- Normalizes PDF rendering artifacts
- Extracts question text, answer options, and correct answers
- Validates extracted data structure

### @ham-exam/exam-core

Platform-agnostic exam engine providing core functionality for exam and study sessions.

**Key features:**
- Exam session creation and management
- Study session creation with progress tracking
- Random question selection with configurable counts per section
- Answer recording and validation
- Score calculation and passing criteria (75% to pass)
- User profile management
- Exam history tracking with statistics
- LocalStorage-based persistence (with adapter pattern for other storage backends)

### @ham-exam/web

React-based web application for taking practice exams and studying.

**Key features:**
- User authentication and profile management
- Configurable exam sessions (questions per section, shuffle options)
- Interactive exam interface with progress tracking
- Study mode with question grid and keyboard navigation
- Detailed results with section breakdowns
- Exam history with statistics
- Dark/light theme toggle with persistent preference
- Responsive design using Tailwind CSS and shadcn/ui components

## Architecture

The project follows a monorepo structure using npm workspaces:

- **Extraction Layer**: Parses PDFs and generates JSON data
- **Core Layer**: Platform-agnostic business logic and data models
- **Presentation Layer**: Web UI consuming the core library

This separation allows the exam engine to be reused in different contexts (web, mobile, CLI) without modification.

## Data Format

Exam questions are stored in JSON format with the following structure:

```json
{
  "version": "1.0.0",
  "extractedAt": "2024-01-20T10:30:00.000Z",
  "sections": [
    {
      "metadata": {
        "sectionNumber": 1,
        "title": "Електротехника и радиотехника",
        "titleEn": "Electrical Engineering and Radio Engineering",
        "examClass": "Радиолюбителски клас 1",
        "lastUpdated": "01.01.2019 г.",
        "sourceFile": "section-1.pdf"
      },
      "questions": [
        {
          "id": "1-1",
          "number": 1,
          "question": "Question text in Bulgarian",
          "options": [
            { "letter": "А", "text": "First option" },
            { "letter": "Б", "text": "Second option" },
            { "letter": "В", "text": "Third option" },
            { "letter": "Г", "text": "Fourth option" }
          ],
          "correctAnswer": "Б"
        }
      ]
    }
  ]
}
```

## Contributing

Contributions are welcome! Please ensure:

1. All tests pass (`npm test`)
2. Code follows the existing style conventions
3. New features include appropriate tests
4. Documentation is updated as needed

## License

MIT

## Acknowledgments

- Official exam materials provided by Bulgarian Communications Regulation Commission
- Built with React 19, TypeScript, Vite, Tailwind CSS, shadcn/ui, Radix UI, and Lucide icons

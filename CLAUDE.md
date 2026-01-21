# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Bulgarian HAM Radio License Exam practice application. Monorepo with three packages using npm workspaces.

## Commands

### Development
```bash
npm run dev              # Start web dev server at localhost:5173
npm run build            # Build web app for production
npm run preview          # Preview production build
```

### Testing
```bash
npm test                 # Run all tests
npm run test:web         # Test web package only
npm run test:exam-core   # Test exam-core package only
npm run test:extractor   # Test extractor package only

# Run single test file (from workspace)
npm test --workspace=packages/web -- src/App.test.tsx
npm test --workspace=packages/exam-core -- src/engine.test.ts

# Watch mode
npm run test:watch --workspace=packages/web

# Coverage (100% thresholds enforced)
npm run test:coverage
```

### Building Packages
```bash
npm run build:packages   # Build exam-core and extractor (required before web can use them)
npm run extract          # Re-extract questions from PDF files
```

### Linting
```bash
npm run lint --workspace=packages/web
```

## Architecture

### Package Structure
```
packages/
├── extractor/     # PDF parsing → JSON (standalone, rarely modified)
├── exam-core/     # Platform-agnostic business logic (no React dependencies)
└── web/           # React frontend consuming exam-core
```

### Key Design Decisions

**exam-core is the source of truth** for all exam/study logic. The web package should only handle UI rendering and state management, calling into exam-core for:
- Exam session creation (`createExamSession`)
- Study session creation (`createStudySession`)
- Answer recording and validation (`recordAnswer`, `checkAnswer`)
- Score calculation (`calculateScore`, `isPassed`)
- Storage operations (`saveUserProfile`, `loadExamHistory`, etc.)

**Storage uses an adapter pattern** (`StorageAdapter` interface in `storage.ts`) allowing different backends. Web uses localStorage wrapper.

**Web app uses view-based navigation** (no router). See `AppView` type in `packages/web/src/types.ts`:
- `login`, `home`, `config`, `exam`, `results`, `history`, `study-section-select`, `study`

**Answer letters use Bulgarian Cyrillic**: `А`, `Б`, `В`, `Г` (not Latin A, B, C, D)

### Data Flow
1. PDFs in `docs/` → extractor → `packages/web/src/data/exam-questions.json`
2. Web loads JSON at startup, passes to exam-core functions
3. exam-core returns session/result objects, web renders them

## Testing

- All packages enforce **100% code coverage thresholds**
- Tests use Vitest with jsdom for web package
- Test files colocated with source: `foo.ts` → `foo.test.ts`
- Web tests use `@testing-library/react`

VERY IMPORTANT: ALWAYS ensure there is 100% code coverage with unit tests, before finishing a task. This is a hard requirement that is non-negotiable!

## Styling

- Tailwind CSS v4 with shadcn/ui components
- Components in `packages/web/src/components/ui/`
- Path alias: `@/` maps to `packages/web/src/`
- Dark/light theme via CSS class on document root

# @ham-exam/web

React-based web application for practicing Bulgarian HAM Radio License Exam questions.

## Features

- User profile management with persistent storage
- Configurable exam sessions (customize questions per section)
- Interactive exam interface with progress tracking
- Detailed results with section-by-section breakdown
- Exam history tracking with statistics
- Responsive design using Tailwind CSS and shadcn/ui components

## Development

Install dependencies (from the monorepo root):

```bash
npm install
```

Start the development server:

```bash
npm run dev --workspace=packages/web
# or from the root:
npm run dev
```

Build for production:

```bash
npm run build --workspace=packages/web
# or from the root:
npm run build
```

## Testing

Run tests:

```bash
npm test --workspace=packages/web
# or from the root:
npm run test:web
```

Run tests with coverage:

```bash
npm run test:coverage --workspace=packages/web
```

## Architecture

This application uses:

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Tailwind CSS v4** - Utility-first CSS
- **shadcn/ui** - UI component library
- **@ham-exam/exam-core** - Core exam engine (shared library)
- **Vitest** - Testing framework
- **Testing Library** - React component testing

## Structure

```
src/
├── components/       # UI components (shadcn/ui)
│   └── ui/
├── data/             # Exam questions JSON
├── lib/              # Utility functions
├── test/             # Test setup
├── App.tsx           # Main application component
├── types.ts          # TypeScript type definitions
├── main.tsx          # Application entry point
└── index.css         # Global styles
```

## Dependencies

The web package depends on:

- `@ham-exam/exam-core` - Core exam engine (workspace dependency)
- React and related libraries
- Radix UI primitives for accessible components
- Lucide React for icons

See `package.json` for the complete list of dependencies.

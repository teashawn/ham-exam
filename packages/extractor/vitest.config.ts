import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      exclude: [
        'src/extract.ts', // CLI script, not unit testable
      ],
    },
  },
});

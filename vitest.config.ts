import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run tests in a single worker to avoid sandbox IPC issues
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 0,
        functions: 0,
        branches: 0,
        statements: 0,
      },
    },
  },
});

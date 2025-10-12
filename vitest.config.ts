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
    // Keep tests isolated and readable without per-file boilerplate
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      thresholds: {
        lines: 59,
        functions: 59,
        branches: 59,
        statements: 59,
      },
      exclude: ['vitest.config.ts', 'eslint.config.mjs', 'commitlint.config.mjs', 'dist/**', 'src/types/**']
    },
  },
});

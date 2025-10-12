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
  },
});

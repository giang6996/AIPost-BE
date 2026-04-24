import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./src/tests/setup.ts'],
    pool: 'threads',
    maxThreads: 1,
    minThreads: 1,
    fileParallelism: false,
    sequence: {
      concurrent: false,
    },
  },
})

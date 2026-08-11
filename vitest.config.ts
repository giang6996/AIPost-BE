import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {

    dir: './src/tests', 
    
    // 2. Only match test files located inside the test folder
    include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'], 
    
    // 3. Explicitly block the dist folder and other build artifacts
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.{idea,git,cache,output,temp}/**'
    ],

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

import { defineConfig } from 'vitest/config';

/** Testes do backend (Express + SQLite), executados em Node — separados dos testes do Angular. */
export default defineConfig({
  test: {
    name: 'server',
    environment: 'node',
    include: ['src/server/**/*.spec.ts'],
    testTimeout: 20_000,
  },
});

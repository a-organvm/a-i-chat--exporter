import { configDefaults, defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./src/__tests__/setup.ts'],
    // `mint/` is a self-contained package with its own vitest + tsconfig + CI job
    // (.github/workflows/mint.yml). Keep it out of the userscript's test run.
    exclude: [...configDefaults.exclude, 'mint/**'],
  },
});

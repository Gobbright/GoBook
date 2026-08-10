const { defineConfig } = require('@playwright/test');

module.exports = defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.cjs',
  outputDir: '.playwright-output',
  timeout: 60000,
  workers: 1,
  use: {
    trace: 'retain-on-failure',
  },
});

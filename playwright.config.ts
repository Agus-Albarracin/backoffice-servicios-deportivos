import { defineConfig } from '@playwright/test';
import { scryptSync } from 'node:crypto';
const salt = '11111111111111111111111111111111';
export default defineConfig({
  testDir: './tests', fullyParallel: false, workers: 1,
  use: { baseURL: 'http://localhost:3101', trace: 'retain-on-failure' },
  webServer: [
    { command: 'node tests/mock-api.mjs', url: 'http://127.0.0.1:4401/health', reuseExistingServer: false },
    { command: 'npm run dev -- --port 3101', url: 'http://localhost:3101/login', reuseExistingServer: false, timeout: 120000,
      env: { NEXT_DIST_DIR: '.next-test', API_BASE_URL: 'http://127.0.0.1:4401/api', APP_ORIGIN: 'http://localhost:3101', MANAGEMENT_API_KEY: 'fixture-management-key', ADMIN_USERNAME: 'admin-test', ADMIN_PASSWORD_HASH: `${salt}:${scryptSync('test-password-only', salt, 64).toString('hex')}`, SESSION_SECRET: 'fixture-session-secret-that-is-longer-than-32-characters' } },
  ],
});

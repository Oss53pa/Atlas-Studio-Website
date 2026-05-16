import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E config — ASVC critical flows.
 *
 * Modes :
 * - Local : `npm run test:e2e` (lance vite dev en webServer, navigateur chromium headless)
 * - CI    : même chose, via .github/workflows/playwright.yml
 *
 * Variables d'env optionnelles :
 * - E2E_BASE_URL          : URL cible (défaut : http://localhost:5173)
 * - E2E_ADMIN_EMAIL       : email d'un user admin pour les tests authentifiés
 * - E2E_ADMIN_PASSWORD    : mot de passe du même user
 * - PLAYWRIGHT_SKIP_WEBSERVER=1 : ne pas lancer vite (cible un serveur déjà up)
 *
 * Les tests authentifiés sont auto-skippés si les creds manquent.
 */

// En CI : on a fait `npm run build` puis on sert `dist/` via vite preview (port 4173)
// En local : vite dev sur 5173 (HMR), sauf E2E_BASE_URL override
const DEFAULT_URL = process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173';
const BASE_URL = process.env.E2E_BASE_URL ?? DEFAULT_URL;
const skipWebServer = process.env.PLAYWRIGHT_SKIP_WEBSERVER === '1' || process.env.E2E_BASE_URL !== undefined;
const webServerCommand = process.env.CI ? 'npm run preview -- --port 4173' : 'npm run dev';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  timeout: 30_000,
  expect: { timeout: 5_000 },

  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  ...(skipWebServer
    ? {}
    : {
        webServer: {
          command: webServerCommand,
          url: BASE_URL,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      }),
});

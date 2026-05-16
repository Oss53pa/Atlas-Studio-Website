// Helpers + fixtures partagés pour les tests E2E ASVC.

import { test as base, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD;

export const hasAdminCreds = Boolean(ADMIN_EMAIL && ADMIN_PASSWORD);

/**
 * Connecte un admin via le formulaire d'accès admin. Les tests qui requièrent
 * un admin doivent appeler `loginAsAdmin(page)` après navigation.
 *
 * En l'absence de creds, le caller doit gérer le skip (utiliser `skipIfNoAdmin`).
 */
export async function loginAsAdmin(page: Page): Promise<void> {
  if (!hasAdminCreds) {
    throw new Error('E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD non définis');
  }
  await page.goto('/admin-access');
  // Le formulaire admin-access utilise un email + password champ standard
  await page.getByLabel(/email/i).first().fill(ADMIN_EMAIL!);
  await page.getByLabel(/mot de passe|password/i).first().fill(ADMIN_PASSWORD!);
  await page.getByRole('button', { name: /se connecter|sign in|continuer|access/i }).first().click();
  // Attend la redirection vers /admin
  await page.waitForURL(/\/admin(\/|$)/, { timeout: 15_000 });
}

/**
 * Test étendu qui skip automatiquement si les creds admin ne sont pas définis.
 * Utile pour les tests qui n'ont de sens qu'authentifiés.
 */
export const adminTest = base.extend({});
adminTest.beforeEach(async ({}, testInfo) => {
  if (!hasAdminCreds) {
    testInfo.skip(true, 'E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD non définis');
  }
});

export const test = base;

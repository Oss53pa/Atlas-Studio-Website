// Tests E2E des flows ASVC critiques. Skip auto si pas de creds admin.

import { expect } from '@playwright/test';
import { adminTest as test, loginAsAdmin } from './fixtures';

test.describe('ASVC — flows critiques', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('le pipeline ASVC charge', async ({ page }) => {
    await page.goto('/admin/asvc/pipeline');
    await expect(page.locator('body')).toBeVisible();
    // Le header de page doit être présent (pas forcément le mot exact)
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
  });

  test('la page System Prompts liste les agents', async ({ page }) => {
    await page.goto('/admin/asvc/agent-prompts');
    await expect(page.getByRole('heading', { name: /system prompts/i })).toBeVisible();
    // La sidebar agents doit lister au moins un agent (par ex. "SDR Agent" ou "Closer Agent")
    const agentButton = page.getByRole('button').filter({ hasText: /agent/i }).first();
    await expect(agentButton).toBeVisible({ timeout: 10_000 });
  });

  test('la page Préférences CEO affiche le mode vacances', async ({ page }) => {
    await page.goto('/admin/asvc/settings');
    await expect(page.getByText(/mode vacances/i)).toBeVisible();
  });

  test('la page Connecteurs liste Apollo', async ({ page }) => {
    await page.goto('/admin/asvc/connectors');
    // Apollo apparaît dans la liste des connecteurs
    await expect(page.getByText(/^Apollo$/).first()).toBeVisible({ timeout: 10_000 });
  });

  test('le Journal des actions charge', async ({ page }) => {
    await page.goto('/admin/asvc/actions');
    await expect(page.getByRole('heading', { name: /journal des actions/i })).toBeVisible();
  });

  test('la page Health Check affiche un statut', async ({ page }) => {
    await page.goto('/admin/asvc/health');
    await expect(page.locator('body')).toBeVisible();
    // Un en-tête ou une zone de statut doit être présente
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
  });
});

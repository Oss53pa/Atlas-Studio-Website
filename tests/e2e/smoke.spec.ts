// Smoke tests — pas d'auth requise. Vérifie que les pages publiques et les
// routes admin se chargent sans erreur JS et que le routing protégé fonctionne.

import { test, expect } from '@playwright/test';

test.describe('Smoke — pages publiques', () => {
  test('la landing page charge', async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('pageerror', (err) => consoleErrors.push(err.message));

    await page.goto('/');
    await expect(page).toHaveTitle(/Atlas Studio|Atlas/i);
    // Au moins un élément visible (logo, header, etc.)
    await expect(page.locator('body')).toBeVisible();
    // Pas d'erreur JS au chargement initial
    expect(consoleErrors, `Erreurs JS: ${consoleErrors.join(' | ')}`).toHaveLength(0);
  });

  test('la page admin-access charge', async ({ page }) => {
    // La route est /admin-access/:token (token obligatoire). Sans token réel,
    // la page bascule en état "loader" puis "erreur lien invalide" — on
    // valide simplement que le composant mount et affiche du contenu (loader
    // ou message d'erreur), pas un input form (ce dernier n'est rendu qu'avec
    // un token valide qui passe la validation côté serveur).
    await page.goto('/admin-access/e2e-smoke-fake-token');
    await expect(page.locator('body')).toBeVisible();

    // Attendre qu'un des trois états s'affiche :
    //   - loader pendant fetch validate-admin-link
    //   - message d'erreur "Lien invalide" après réponse 4xx
    //   - form (cas extrêmement improbable avec un fake token, mais on
    //     l'inclut pour robustesse si Supabase est down et le fetch jette)
    const loaderOrError = page.getByText(
      /chargement|loader|invalide|expire|expir.|administrateur|access/i,
    );
    await expect(loaderOrError.first()).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Smoke — routes admin protégées', () => {
  // Non authentifié → redirection vers admin-access ou login
  test('/admin/asvc/pipeline redirige si non authentifié', async ({ page }) => {
    await page.goto('/admin/asvc/pipeline');
    // Attendre que le routing ait fini (URL stabilisée hors de /pipeline ou écran de login affiché)
    await page.waitForLoadState('networkidle');
    const url = page.url();
    const isOnPipeline = /\/admin\/asvc\/pipeline/.test(url);
    if (isOnPipeline) {
      // Soit le composant a affiché un écran de login interne, soit un loader
      const body = await page.locator('body').textContent();
      // Pas de contenu type "actions" / "arbitration" qui ne s'affiche que loggé
      expect(body ?? '').not.toMatch(/Arbitrations en attente/i);
    } else {
      // Redirection : doit pointer vers une page d'auth
      expect(url).toMatch(/admin-access|login|auth|\/$/);
    }
  });

  test('/admin/asvc/agent-prompts redirige si non authentifié', async ({ page }) => {
    await page.goto('/admin/asvc/agent-prompts');
    await page.waitForLoadState('networkidle');
    const body = await page.locator('body').textContent();
    // Pas d'éditeur visible quand non loggé
    expect(body ?? '').not.toMatch(/Nouvelle version/i);
  });
});

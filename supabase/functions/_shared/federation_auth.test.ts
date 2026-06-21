// Tests de la remédiation AN-1 (audit 360°) : audience `aud`, cohérence du token
// SSO, et isolation cryptographique par clé d'app.
//
// Exécution (env factices requis car federation_auth importe le client supabase) :
//   SUPABASE_URL=http://localhost \
//   SUPABASE_SERVICE_ROLE_KEY=test \
//   JWT_SECRET=shared-test-secret \
//   JWT_SECRET_SCRUTIX=scrutix-own-secret \
//   deno test --allow-env supabase/functions/_shared/federation_auth.test.ts
//
// (Un helper PowerShell `run_federation_tests.ps1` positionne ces variables.)

import {
  assertEquals,
  assertRejects,
} from "https://deno.land/std@0.224.0/assert/mod.ts";
import { create } from "https://deno.land/x/djwt@v3.0.2/mod.ts";
import { verifySsoToken } from "./federation_auth.ts";
import { AuthError } from "./auth.ts";
import { getSigningKey } from "./federation_keys.ts";

const NOW = () => Math.floor(Date.now() / 1000);

/** Mint un token SSO comme le fait `app-token` (clé résolue par app). */
async function mint(
  appId: string,
  opts: { aud?: string; exp?: number; userId?: string } = {},
): Promise<string> {
  const key = await getSigningKey(appId);
  if (!key) throw new Error("clé de signature absente — env JWT_SECRET manquant ?");
  return await create(
    { alg: "HS256", typ: "JWT", kid: appId },
    {
      userId: opts.userId ?? "user-1",
      appId,
      aud: opts.aud ?? appId,
      plan: "Pro",
      iat: NOW(),
      exp: opts.exp ?? NOW() + 3600,
    },
    key,
  );
}

/** Mint en signant DÉLIBÉRÉMENT avec le secret partagé (pour forger). */
async function mintWithSharedSecret(appId: string): Promise<string> {
  const sharedKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(Deno.env.get("JWT_SECRET")!),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return await create(
    { alg: "HS256", typ: "JWT", kid: appId },
    { userId: "user-1", appId, aud: appId, plan: "Pro", iat: NOW(), exp: NOW() + 3600 },
    sharedKey,
  );
}

Deno.test("token valide accepté sans contrainte d'audience", async () => {
  const token = await mint("atlas-fa");
  const payload = await verifySsoToken(token);
  assertEquals(payload?.userId, "user-1");
  assertEquals(payload?.aud, "atlas-fa");
});

Deno.test("token accepté quand l'audience attendue correspond", async () => {
  const token = await mint("atlas-fa");
  const payload = await verifySsoToken(token, { audience: "atlas-fa" });
  assertEquals(payload?.appId, "atlas-fa");
});

Deno.test("token accepté quand l'app figure dans la liste d'audiences", async () => {
  const token = await mint("atlas-fa");
  const payload = await verifySsoToken(token, { audience: ["cockpit-fa", "atlas-fa"] });
  assertEquals(payload?.aud, "atlas-fa");
});

Deno.test("AN-1 : token de l'app A REFUSÉ pour une action scopée app B", async () => {
  const tokenA = await mint("atlas-fa");
  await assertRejects(
    () => verifySsoToken(tokenA, { audience: "cockpit-fa" }),
    AuthError,
    "hors périmètre",
  );
});

Deno.test("token incohérent (aud ≠ appId) refusé", async () => {
  // Signé correctement mais aud forcé ≠ appId → tampering défensif.
  const token = await mint("atlas-fa", { aud: "cockpit-fa" });
  await assertRejects(
    () => verifySsoToken(token),
    AuthError,
    "incohérent",
  );
});

Deno.test("token expiré → null (non reconnu, pas une erreur dure)", async () => {
  const token = await mint("atlas-fa", { exp: NOW() - 10 });
  assertEquals(await verifySsoToken(token), null);
});

Deno.test("garbage / non-JWT → null", async () => {
  assertEquals(await verifySsoToken("pas-un-jwt"), null);
});

Deno.test("isolation par clé : token d'une app à clé propre vérifie avec SA clé", async () => {
  // JWT_SECRET_SCRUTIX est provisionné → mint+verify utilisent la clé propre.
  const token = await mint("scrutix");
  const payload = await verifySsoToken(token);
  assertEquals(payload?.appId, "scrutix");
});

Deno.test("isolation par clé : token 'scrutix' forgé avec le secret PARTAGÉ rejeté", async () => {
  // scrutix a sa propre clé : un token signé avec le secret partagé mais se
  // réclamant de scrutix échoue la vérification (sélection clé per-app) → null.
  const forged = await mintWithSharedSecret("scrutix");
  assertEquals(await verifySsoToken(forged), null);
});

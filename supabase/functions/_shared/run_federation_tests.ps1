# Exécute les tests Deno de federation_auth (audit 360° — AN-1).
# Positionne des env factices (client supabase importé) + secrets de test, dont
# une clé propre à 'scrutix' pour valider l'isolation par clé.
#
#   pwsh supabase/functions/_shared/run_federation_tests.ps1
#
# Prérequis : Deno installé (https://deno.land). Si absent :
#   irm https://deno.land/install.ps1 | iex

$env:SUPABASE_URL = "http://localhost"
$env:SUPABASE_SERVICE_ROLE_KEY = "test-service-role"
$env:JWT_SECRET = "shared-test-secret-do-not-use-in-prod"
$env:JWT_SECRET_SCRUTIX = "scrutix-own-test-secret"

$testFile = Join-Path $PSScriptRoot "federation_auth.test.ts"
deno test --allow-env $testFile

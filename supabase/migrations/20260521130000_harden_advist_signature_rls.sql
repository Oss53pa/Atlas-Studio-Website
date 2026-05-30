-- Durcissement RLS — signature électronique Advist.
-- Retire les accès `anon` trop larges sur des données sensibles
-- (otp_hash, téléphone/email signataire, IP, consentements légaux) :
--   - lecture anon de TOUS les signer_verifications (exposition des OTP)
--   - mise à jour anon de TOUS les signer_verifications (tampering de l'état de vérification)
--   - lecture anon de TOUS les signature_consents (PII signataire)
-- L'accès légitime reste couvert par les policies service_role (edge functions)
-- et propriétaire authentifié déjà en place. L'INSERT anon (dépôt par le
-- signataire externe) est conservé.

drop policy if exists "anon_select_signer_verifications" on public.signer_verifications;
drop policy if exists "anon_update_signer_verifications" on public.signer_verifications;
drop policy if exists "anon_select_signature_consents" on public.signature_consents;

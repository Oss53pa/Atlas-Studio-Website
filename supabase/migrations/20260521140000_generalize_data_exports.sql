-- Généralise le pont inter-apps au-delà de la balance.
-- atlas_balance_exports devient un canal générique d'échange de données
-- comptables entre apps (balance, grand livre, états financiers, etc.).
--   - dataset_type : type de jeu de données (défaut 'balance' pour la rétro-compat)
--   - source_app   : app émettrice (ex. 'atlas-fa')
-- Les lignes existantes (publiées par export-balance) restent en 'balance'.

alter table public.atlas_balance_exports
  add column if not exists dataset_type text not null default 'balance',
  add column if not exists source_app text;

create index if not exists atlas_balance_exports_owner_type_idx
  on public.atlas_balance_exports (user_id, dataset_type, status);

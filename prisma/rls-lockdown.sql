-- Verrouillage RLS pour toutes les tables du schéma public.
-- Contexte : l'application accède aux données exclusivement via Prisma (rôle
-- Postgres direct, non soumis aux policies RLS orientées PostgREST). RLS est
-- activé ici sans aucune policy permissive, en pure précaution défensive :
-- si la clé anon/service_role fuitait, l'accès via l'API PostgREST de
-- Supabase resterait totalement bloqué sur ces tables.
--
-- À exécuter dans le SQL Editor de Supabase après la première migration Prisma.

alter table public."Module" enable row level security;
alter table public."SousModule" enable row level security;
alter table public."Fonction" enable row level security;
alter table public."FonctionModuleDefaut" enable row level security;
alter table public."Utilisateur" enable row level security;
alter table public."AccesUtilisateur" enable row level security;
alter table public."HistoriqueStatut" enable row level security;

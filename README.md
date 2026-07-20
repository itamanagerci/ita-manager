# ITA Digital

Plateforme de gestion d'entreprise (BTP/construction) — Next.js (App Router) + TypeScript + Tailwind + shadcn/ui + Prisma + Supabase (PostgreSQL + Auth + Storage) + Resend.

Ce dépôt contient le **Lot 0 — Socle technique** : authentification, modèle de rôles (niveau hiérarchique + fonction), résolution dynamique des accès aux modules, thème, et composants UI génériques. Aucun module métier (Achat, QHSE, etc.) n'est implémenté ici.

## Prérequis

- Node.js 20.19+ / 22.12+ / 24+
- pnpm (`npm install -g pnpm`)
- Un projet Supabase (PostgreSQL + Auth)

## Configuration

1. Copier `.env.example` vers `.env.local` et renseigner les valeurs depuis le dashboard Supabase (Settings → API pour les clés, Settings → Database pour les chaînes de connexion — mode "Transaction"/pooling pour `DATABASE_URL`, connexion directe pour `DIRECT_URL`) :

   ```bash
   cp .env.example .env.local
   ```

2. Installer les dépendances :

   ```bash
   pnpm install
   ```

3. Appliquer le schéma et peupler les données de référence (modules/sous-modules, fonctions, 2 comptes de test) :

   ```bash
   pnpm db:migrate
   pnpm db:seed
   ```

   Les comptes de test créés (mot de passe temporaire `ChangeMoi123!`, changement obligatoire à la première connexion) :
   - `rh.test@itamanager.cloud` — Fonction "Responsable RH" (accès à tous les modules, y compris la gestion des accès)
   - `chantier.test@itamanager.cloud` — Fonction "Chef de chantier" (accès restreint)

4. (Recommandé) Exécuter `prisma/rls-lockdown.sql` dans le SQL Editor de Supabase pour verrouiller RLS sur les tables `public.*` (l'application accède aux données via Prisma, pas via PostgREST).

5. Lancer le serveur de développement :

   ```bash
   pnpm dev
   ```

   Ouvrir [http://localhost:3000](http://localhost:3000).

## Scripts utiles

| Commande | Description |
|---|---|
| `pnpm dev` | Serveur de développement |
| `pnpm build` | Build de production |
| `pnpm lint` | ESLint |
| `pnpm db:migrate` | Applique les migrations Prisma (`prisma migrate dev`) |
| `pnpm db:seed` | Peuple le référentiel Module/SousModule/Fonction + comptes de test |
| `pnpm db:studio` | Ouvre Prisma Studio |

## Structure

```
src/
  app/
    (auth)/            → login, première connexion (route group, pas de préfixe d'URL)
    dashboard/          → zone connectée (segment réel, garde d'accès complète)
  components/
    ui/                 → composants shadcn
    ui/composed/         → composants maison réutilisables (sidebar, statut, notifications...)
  lib/
    supabase/            → clients Supabase (browser/server/middleware/admin)
    server-actions/       → résolution des accès, guards, provisioning, historique
  types/
prisma/
  schema.prisma, seed.ts, rls-lockdown.sql
```

Déploiement visé : Vercel (connecté au dépôt GitHub), domaine `app.itamanager.cloud` via Cloudflare.

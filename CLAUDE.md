# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

ITA Digital is a business management platform (BTP/construction) being built module by module. This repository currently contains **Lot 0 — Socle technique** only: authentication, the role/access model, theming, and generic reusable UI components. No business module (Achat, QHSE, RH forms, Logistique, etc.) is implemented yet — only the structural referential (`Module`/`SousModule`) they will plug into.

Stack: Next.js 16 (App Router) + TypeScript + Tailwind v4 + shadcn/ui + Prisma 6 + Supabase (PostgreSQL + Auth + Storage) + Resend/react-email. Package manager is **pnpm** (not npm/yarn).

## Commands

```bash
pnpm dev            # dev server
pnpm build           # production build (also runs TypeScript checking)
pnpm lint            # ESLint
npx tsc --noEmit     # type-check only, no build

pnpm db:migrate      # prisma migrate dev
pnpm db:seed         # prisma db seed -> runs prisma/seed.ts via tsx
pnpm db:studio       # prisma studio
npx prisma generate  # regenerate the Prisma client after editing schema.prisma
```

There is no test runner configured yet.

### Environment

Copy `.env.example` to `.env.local` and fill in Supabase values (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL` pooled/pgbouncer, `DIRECT_URL` direct connection for migrations). `prisma.config.ts` loads `.env.local` explicitly via `dotenv` because the Prisma CLI runs outside of Next.js and does not get Next's automatic env loading. After a schema change, run `db:migrate` then regenerate the client if needed.

`prisma/rls-lockdown.sql` should be run once in the Supabase SQL editor to enable RLS with zero permissive policies on `public.*` — pure defense-in-depth since the app never talks to Postgres through PostgREST (see Data access below).

## Architecture

### Data access: Prisma only, Supabase Auth only for auth

Two separate, non-overlapping systems:
- **Supabase client** (`src/lib/supabase/{client,server,middleware,admin}.ts`) is used **exclusively** for `supabase.auth.*` calls (sign in, sign out, password update, session/cookie refresh). Never call `supabase.from(...)` to read/write `public.*` tables.
- **Prisma** (`src/lib/prisma.ts`, a hot-reload-safe singleton) is the only way application data is read or written, always from Server Components or Server Actions.

Server-side auth checks always use `supabase.auth.getUser()`, never `getSession()` — `getUser()` revalidates the JWT against the Supabase Auth server; `getSession()` trusts the cookie without validation.

The `Utilisateur` (app user) table is linked to Supabase's `auth.users` via a plain scalar column, `Utilisateur.authUserId` (`String @unique @db.Uuid`) — **not** a Prisma relation or a Postgres FK. Prisma's `schemas`/multi-schema config and a shadow `AuthUser` model mapped to `auth.users` were tried and reverted: `prisma migrate dev` treated Supabase's internal auth tables (sessions, MFA, OAuth...) as part of Prisma's managed schema and proposed resetting them as "drift" — dangerous, since that's live Supabase Auth state, not application data. Prisma now only knows about the `public` schema; matching a `Utilisateur` to its Supabase user is always a plain value comparison (`where: { authUserId: user.id }`), never a Prisma `include`/join. No password is ever stored in the `Utilisateur` table — passwords live entirely in Supabase Auth.

### Two-tier route guarding

1. **`src/proxy.ts`** (Next.js 16's replacement for `middleware.ts` — the file convention was renamed) does a coarse, cheap check on every request: refresh Supabase session cookies, redirect unauthenticated requests away from `/dashboard`, redirect authenticated requests away from `/login`. It knows nothing about business rules.
2. **`src/app/dashboard/layout.tsx`** is the single point of truth for fine-grained logic: resolves the Prisma `Utilisateur`, kills the session and redirects if `statut === "INACTIF"` (`requireCompteActif` in `lib/server-actions/guards.ts`), force-redirects to `/premiere-connexion` if `premiereConnexion === true`, then resolves the sidebar's accessible modules.

`src/app/(dashboard)` does **not** exist as a route group — it was deliberately renamed to the real segment `src/app/dashboard/` early on, because a parenthesized route group adds no URL prefix and was silently colliding with the root `/` route from `src/app/page.tsx`. Keep this in mind if you're tempted to reintroduce a `(dashboard)` group: pick a real segment for anything that needs a `/dashboard/...` URL. `(auth)` remains a route group on purpose — `/login` and `/premiere-connexion` are meant to live at the root, not under `/auth/...`.

### Access-control model (module 0 — the referential every future module hangs off)

Two independent axes, deliberately kept separate to avoid a combinatorial explosion of roles:
- `niveauHierarchique` (`DIRECTEUR` | `CHEF_SERVICE` | `AGENT`) — will drive who approves what in future modules' validation workflows.
- `Fonction` (a free-form referential, e.g. "Responsable RH", "Chef de chantier") — drives which `Module`/`SousModule` entries show up in the sidebar.

Key rule from `prisma/schema.prisma`: **every `Module` always has at least one `SousModule`**, including "single-flow" modules like Service Achat (via a synthetic sous-module, e.g. `achat` → `acces`). This is intentional — it keeps `AccesUtilisateur.sousModuleId` non-nullable everywhere, which is what makes the `@@unique([utilisateurId, sousModuleId])` constraint actually enforce uniqueness (Postgres treats `NULL` as always-distinct, so a nullable FK there would silently allow duplicates), and it means sidebar/guard logic never needs a "module without children" special case.

Access resolution (`lib/server-actions/acces.ts`, `getModulesAccessibles`) filters on three things simultaneously: `AccesUtilisateur.actif` (per-user grant), `SousModule.actif` (a global product kill-switch — e.g. RH "Pointage" is seeded `actif: false` and excluded from every Fonction's defaults), and `Module.visibleMenu` (the transversal `authentification-roles` module is `visibleMenu: false` and never appears in the generic menu).

There is deliberately **no separate technical "Admin" role**. The `authentification-roles` module (RH account/access management) is protected the exact same way as any future business module would be, via `requireAccesModule(utilisateurId, moduleCode, sousModuleCode)` in `lib/server-actions/guards.ts` — see `src/app/dashboard/parametres/acces/page.tsx` for the reference pattern to copy when adding a protected page. Whether a given Fonction can reach it is just a matter of whether `gestion-comptes-acces` is in that Fonction's `FonctionModuleDefaut` list.

`AccesUtilisateur.estException` marks a per-user manual override made by RH. It matters for propagation: when a Fonction's default module list changes, `propagerModificationFonction()` (`lib/server-actions/user-provisioning.ts`) bulk-updates every user of that Fonction *except* rows already flagged `estException: true`. New users get their initial grants copied from `FonctionModuleDefaut` via `initialiserAccesDepuisFonction()`.

**Sidebar visibility never special-cases `niveauHierarchique`.** This was an open question carried over from Lot 0 and was explicitly resolved for Lot 1: `direction-generale` — despite being the module a company director would intuitively expect to always see — is gated by `Fonction`/`AccesUtilisateur` exactly like every other module, with zero branching on `niveauHierarchique === "DIRECTEUR"` in `getModulesAccessibles()`. A user with `niveauHierarchique: DIRECTEUR` but the wrong `Fonction` will not see it; RH is expected to assign the "Direction Générale" `Fonction` to whoever should. `niveauHierarchique` still does exactly what Lot 0 said it would — decide who a validation is addressed to inside a page's content (see `DemandeIndex` below) — it just never decides what shows up in the menu.

### Status/history pattern for future business workflows

`HistoriqueStatut` (in `schema.prisma`) is the generic audit-trail table every future validation circuit (Achat, Congés, AST, etc.) is meant to reuse. It has no FK to business tables — Prisma doesn't support polymorphic relations, so it uses an application-level discriminant (`entiteType` + `entiteId`, indexed together) instead. Write to it via `enregistrerTransition()` in `lib/server-actions/historique.ts`. When you add a business module with a validation workflow, give its table its own `statut` enum/string field and log every transition here rather than inventing a per-module history table.

### Aggregation layer for Direction Générale (`DemandeIndex`)

`DemandeIndex` (schema.prisma) is a **projection of current state**, distinct from `HistoriqueStatut`'s **event log**: one row per business entity (upserted via the same `entiteType`+`entiteId` discriminant, `@@unique` enforced), always reflecting the latest known status — never an append-only history. Every future module with a validation workflow is expected to call both `enregistrerTransition()` and `upsertDemandeIndex()` (`lib/server-actions/demande-index.ts`) on each status change — one for the audit log, one for the DG-level projection — never one without the other.

Convention: a demande counts as "en attente" if `enAttenteValidationDe` (a `NiveauHierarchique`, for circuits that designate a generic role like "Directeur Général") or `enAttenteValidationUtilisateurId` (a specific `Utilisateur`, for circuits like "the requester's direct supervisor") is non-null; "traité" (resolved) once both are null. `upsertDemandeIndex()` always **overwrites** both fields with whatever is passed (defaulting to `null`) rather than merging — so a resolved demande can never keep displaying a stale "waiting on X". This binary signal, not `statutLibelle` (a free string — each module keeps its own status enum/wording), is what drives every DG aggregation query (`src/app/dashboard/direction-generale/{suivi,kpi}/page.tsx`).

The DG pages also need to know which *resolved* demandes were approved vs. rejected (for "montant total validé" in KPI), but `DemandeIndex` deliberately has no structured outcome field for that — it falls back to a keyword heuristic on `statutLibelle` (`tonaliteDepuisStatutLibelle()` in `lib/demande-index-tonalite.ts`: `valid/approuv/accept` → success, `refus/rejet/annul` → danger, `attente` → attention, else neutral), the same one used to color `StatutBadge` in the DG pages. Revisit this if a future module's status wording doesn't match any keyword — it'll silently fall through to "neutre"/excluded-from-validated-total rather than error.

### Theming

CSS custom properties in `src/app/globals.css` mix `oklch()` (shadcn's Nova preset defaults) and raw hex (the ITA Digital brand colors) — that's fine, each CSS variable just holds a color value, the format doesn't need to be consistent across variables. Brand tokens: `--brand-navy` (#002a5c), `--brand-magenta` (#7f0f59), `--brand-green` (#13850b). Five status tones are registered under `--status-{success,info,attention,danger,neutral}` and exposed as Tailwind utilities (`bg-status-danger`, `text-status-info`, etc.) via the `@theme inline` block — use those classes rather than arbitrary-value `[hsl(var(--x))]` syntax. Only `--status-success` maps directly to a brand color; the other four are supplementary since the brand palette only defines three hues. Dark-mode overrides live in a single `.dark { ... }` block — if you add another `.dark` block, later declarations win, so keep it merged rather than appending a second one.

Open Sans is loaded in `src/app/layout.tsx` with `next/font/google` under the CSS variable name `--font-sans` specifically (not `--font-open-sans`), because `globals.css`'s `@theme inline` block maps `--font-sans: var(--font-sans)` — the font's variable name has to match that exactly for the mapping to resolve. `PageHeader` (`components/ui/composed/page-header.tsx`) applies bold titles by convention; use it rather than hand-rolling `<h1>` styling.

### Generic reusable components (`src/components/ui/composed/`)

`StatutBadge`, `NotificationBell`, and the `useNotifier()` hook (`src/hooks/use-notifier.ts`, wraps `sonner`) are intentionally decoupled from any business data — they take generic props (`label`/`tonalite`, `NotificationItem[]`, etc.) and every future business module is expected to map its own status enum / notification source onto these rather than growing module-specific status or notification UI.

### Dependency-tree quirk: keep zod pinned to one version

`pnpm-workspace.yaml` has `overrides: zod: ^4.4.3`. Without it, the `shadcn` CLI (a devDependency) transitively pulls in an old `zod@3.25.x` via `@modelcontextprotocol/sdk`, and pnpm's strict linking resolves `@hookform/resolvers/zod` against that old copy instead of the top-level zod — this breaks `zodResolver()`'s TypeScript overloads in `login-form.tsx`/`change-password-form.tsx` with a confusing "Types of property '_def' are incompatible" error even though both are nominally "zod v4". If a fresh `pnpm install` ever reintroduces a duplicate zod, check `pnpm why zod` before debugging the forms themselves.

That same override breaks the `shadcn` CLI itself at runtime: `shadcn` declares `zod: ^3.24.1` and calls `.deepPartial()` internally, a method zod v4 removed — `npx shadcn add <component>` crashes with `TypeError: s.deepPartial is not a function` because `npx` resolves `zod` from this project's (overridden) `node_modules`. Use `pnpm dlx shadcn@latest add <component>` instead — it runs in an isolated temp install outside this project's `pnpm-workspace.yaml`, unaffected by the override.

### Prisma version note

Pinned to Prisma **6.x** deliberately, not the latest 7.x. Prisma 7 removed `datasource.url`/`directUrl` from `schema.prisma` in favor of driver adapters configured in `prisma.config.ts`, which is a bigger migration than this project needs right now (Supabase's standard pooled/direct URL split works out of the box on v6). Don't casually bump past 7 without accounting for that.

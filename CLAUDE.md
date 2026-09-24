@AGENTS.md

# Argent Brut — gestion financière freelance

Application de gestion financière pour développeur web indépendant en France
(micro-entreprise / EURL / SASU). Le design (system riso/brutaliste, papier +
encre) est validé et figé : on ne touche jamais aux tokens visuels, seulement
au fonctionnel. Cahier des charges complet : `.claude/PROMPT.md`.

## Stack

- Next.js 16.3.3 (App Router), TypeScript strict, Tailwind v4 (`@tailwindcss/postcss`).
  **Cette version de Next.js a des changements cassants vs. ce que tu crois savoir.**
  Toujours lire `node_modules/next/dist/docs/` avant d'écrire du code touchant
  routing, cache, auth, images, ou config. Points déjà identifiés :
  - `middleware.ts` est déprécié → utiliser `proxy.ts` avec `export function proxy()`
    (runtime Node.js uniquement, pas d'edge).
  - `cookies()`, `headers()`, `draftMode()`, `params`, `searchParams` sont
    **toujours asynchrones** (`await`), plus de mode sync.
  - `next lint` est supprimé. Le lint passe par ESLint direct (config flat à
    créer en Phase 1, script `pnpm lint` = `eslint .`).
  - `revalidateTag(tag, profile)` exige un 2ᵉ argument (ex: `'max'`) ; pour un
    rafraîchissement immédiat après mutation, utiliser `updateTag` (Server
    Actions uniquement) plutôt que `revalidateTag`.
  - Turbopack est le bundler par défaut (`next dev` / `next build`), pas besoin
    de flag.
  - `next.config.mjs` avait `typescript.ignoreBuildErrors: true` (hérité du
    template v0) : **retiré en Phase 1**, `pnpm typecheck` est propre.
- PostgreSQL sur Neon (`@neondatabase/serverless`, driver `neon-serverless`
  avec `Pool` — pas `neon-http` : on a besoin de vraies transactions pour le
  verrou de numérotation des factures, Phase 6) + Drizzle ORM / drizzle-kit.
  Projet Neon **provisionné et migré** : `argentbrut` (id `silent-leaf-45487999`,
  branche `production` = `br-falling-sky-b1nyxq4l`, région `aws-eu-central-1`,
  Postgres 18) + branche `test` = `br-super-sea-b1zrrucm` (tests d'intégration
  uniquement, Phase 3). Ne jamais toucher aux autres projets Neon visibles sur
  le compte (`MistyCatss`, `logos-prod`, `logos`, `momentum`, `swizzer-prod`,
  `mistycates` — appartiennent à d'autres projets).
  ⚠️ **Toute migration de schéma doit être appliquée aux DEUX branches** :
  ```bash
  pnpm exec drizzle-kit migrate                                    # branche production/dev
  TEST_URL=$(grep '^TEST_DATABASE_URL_UNPOOLED=' .env.local | cut -d= -f2-)
  DATABASE_URL_UNPOOLED="$TEST_URL" pnpm exec drizzle-kit migrate   # branche test
  ```
  (la branche test a été créée par copie-sur-écriture de production à un
  instant T — drizzle-kit ne les synchronise pas automatiquement après coup).
- Auth : Better Auth (email/mot de passe, vérification, reset, sessions, TOTP),
  adaptateur Drizzle (`lib/auth.ts`). Schéma généré via
  `pnpm exec better-auth generate --config lib/auth.ts --output db/schema/auth.ts`
  (ne pas éditer `db/schema/auth.ts` à la main, le régénérer après toute
  modification de plugins dans `lib/auth.ts`). Fallback documenté vers Auth.js
  v5 credentials si blocage.
- Emails : Resend, fallback console + `.mail/*.html` si `RESEND_API_KEY` absent.
- Validation : Zod (serveur, systématique) + React Hook Form (client).
- Tableaux denses : TanStack Table. État des filtres/URL : `nuqs`.
- PDF : lib à choisir en Phase 6, toujours derrière `InvoiceExporter`.
- Tests : Vitest (unitaire), Playwright (parcours critiques).
- Déploiement : Vercel (fait par l'utilisateur, jamais par moi). Cron Jobs via
  `vercel.json`. Stockage : Vercel Blob en prod, filesystem local en dev,
  derrière `lib/storage.ts`.

## Conventions

- Montants : entiers en **centimes** partout en base (colonnes `*_cents`),
  jamais de float. `lib/money.ts` sera créé en Phase 5 (première consommatrice :
  calcul des lignes de devis/factures) pour centraliser addition, répartition,
  arrondi TVA, formatage fr-FR/EUR — ne pas dupliquer de `eur()` ad hoc
  ailleurs d'ici là.
  ⚠️ `lib/mock-data.ts` (encore utilisé par les écrans actuels, non branchés
  DB) stocke les montants en **euros entiers** (ex. `ht: 3300` = 3 300 €). Ce
  mock sera retiré au fur et à mesure du branchement des écrans sur la vraie
  base (Phases 5+).
- Taux (TVA, pénalités...) stockés en **points de base entier**
  (`vat_rate_basis_points` : 2000 = 20,00 %, 550 = 5,50 %), jamais en float.
- Dates stockées en UTC, affichées Europe/Paris, semaines au lundi, tout en
  français.
- Toute requête passe par un helper de scoping utilisateur (Phase 3).
- Calculs fiscaux/rentabilité : fonctions pures dans `lib/fiscal/`, date de
  référence toujours en paramètre, jamais `new Date()` implicite.
- Un commit atomique par phase, message conventionnel, jamais de `.env*` commité.

## Structure actuelle (audit Phase 0)

```
app/
  layout.tsx            racine, police, Analytics (prod only)
  page.tsx               "/" → DashboardScreen
  [...slug]/page.tsx     routeur mock pour toutes les autres pages (voir ci-dessous)
  globals.css             tokens de design (voir section Design)
components/
  finance-shell.tsx      layout applicatif : sidebar, header, palette Cmd+K, ThemeContext
                          + primitives partagées (SectionLabel, ButtonPrimary/Secondary,
                          StatCard, EmptyPoster)
  dashboard-screen.tsx    écran "/"
  finance-screens.tsx     tous les autres écrans (Invoices, Clients, Treasury,
                          Time, Forecast, Settings, StyleGuide) — un seul fichier,
                          tout en 'use client', état local uniquement
  theme-switcher.tsx      sélecteur de 8 palettes de couleurs (client-side, non persisté)
  ui/button.tsx           unique composant shadcn/base-ui installé (style "base-nova"),
                          NON utilisé par les écrans finance actuels (ils ont leurs
                          propres boutons dans finance-shell.tsx)
lib/
  mock-data.ts            14 clients, 40 factures, 6 devis, CA mensuel, échéances fiscales
                           (encore utilisé par les écrans, à retirer au fil des Phases 5+)
  utils.ts                cn() (clsx + tailwind-merge)
  auth.ts                 instance Better Auth (config email/2FA/rate limit, Phase 1-2)
  auth-client.ts           client Better Auth (React), plugin twoFactor
  auth/session.ts          DAL : getSession()/requireSession(), mémoïsé
  auth/actions.ts          Server Actions signup/reset/change-password (policy check inclus)
  auth/password-policy.ts  longueur + liste locale de mots de passe compromis
  auth/common-passwords.ts liste locale (483 entrées ≥12 car., voir décisions Phase 2)
  email.ts                 envoi Resend + fallback console/.mail/
  email/templates.ts       templates HTML des emails transactionnels
components/
  form/field.tsx           <Field>/<FormError>/inputClassName partagés par tous les formulaires
  settings/security-settings.tsx  page Sécurité (mot de passe, 2FA, sessions, email, RGPD)
app/(auth)/                login, signup, forgot-password, reset-password (layout partagé)
app/settings/security/     page Sécurité (vraie route, prioritaire sur le routeur mock)
app/settings/page.tsx      entreprise, statuts/périodes, préférences, numérotation, thème (Phase 4)
app/settings/fiscal/[year]/  paramètres fiscaux par année/statut (Phase 4)
app/onboarding/             première configuration, 5 étapes sautables (Phase 4)
app/api/auth/[...all]/     handler Better Auth
app/api/account/export/    export RGPD (GET, protégé)
proxy.ts                   vérification optimiste de session (redirections /login)
lib/db/scope.ts           withUserScope/withCurrentUserScope — point de passage RLS obligatoire (Phase 3)
lib/db/__tests__/         tests d'isolation multi-comptes + statuts à cheval (branche Neon "test")
lib/fiscal/param-definitions.ts  source de vérité des paramètres fiscaux (Phase 4)
lib/fiscal/params/<année>.ts     structure documentée, valeurs à null
lib/fiscal/get-params.ts         résolution DB + résultat typé missing_params
lib/settings/actions.ts          Server Actions entreprise/statuts/préférences/numérotation/fiscal/onboarding
lib/onboarding/steps.ts          liste des étapes + calcul de complétude
components/fiscal/missing-param-banner.tsx  encart réutilisable (Phase 8+)
components/settings/general-settings.tsx, fiscal-year-form.tsx, onboarding-checklist.tsx
lib/money.ts                     montants centimes/points de base : arrondi TVA ligne par ligne (Phase 5)
lib/clients/                     queries.ts (indicateurs calculés), actions.ts (CRUD + doublons)
lib/quotes/                      queries.ts (expiration paresseuse), actions.ts (cycle de vie complet)
lib/documents/exporter.ts        interface DocumentExporter<T>, réutilisée par InvoiceExporter (Phase 6)
lib/documents/numbering.ts       compteur atomique partagé devis/factures + test de concurrence
lib/documents/quote-pdf.tsx, quote-exporter.ts, fonts.ts
assets/fonts/                    .ttf vendorisés pour l'embarquement PDF (voir décisions Phase 5)
components/clients/, components/quotes/
app/clients/, app/quotes/, app/invoices/, app/public/quotes/[token]/
lib/invoicing/                   actions.ts (émission/avoir/paiement/relance), queries.ts, legal-mentions.ts (pur)
lib/invoicing/accounting-export.ts  CSV + FEC
lib/documents/invoice-pdf.tsx, invoice-exporter.ts
components/invoicing/, app/invoices/[id]/, app/invoices/new/, app/public/invoices/[token]/
db/
  client.ts               instance Drizzle neondb_owner (BYPASSRLS — admin/migrations/seed/Better Auth)
  scoped-client.ts         instance Drizzle app_scoped (NOBYPASSRLS — lib/db/scope.ts uniquement)
  schema/                 voir section "Schéma de données" ci-dessous
  seed.ts                 seed de développement idempotent (pnpm db:seed)
drizzle/                  migrations SQL générées + snapshots (drizzle/meta/)
drizzle.config.ts
eslint.config.mjs         flat config (ESLint 9, next lint n'existe plus en v16)
vitest.config.mts
```

### Routes (via `app/[...slug]/page.tsx`, fallback = styleguide)

| Route         | Écran            | Fonctionnel ?                                    |
|---------------|------------------|---------------------------------------------------|
| `/`           | DashboardScreen  | Lecture seule, données en dur                     |
| `/time`       | TimeScreen       | Chrono = faux (état bool, temps affiché en dur)    |
| `/styleguide` | StyleGuideScreen | Démo de design system, pas un écran produit         |

`settings`, `clients`, `invoices`, `treasury` et `forecast` ont été retirés
de ce routeur mock (Phases 4-8) : ce sont de vraies routes, prioritaires sur
`app/[...slug]/page.tsx`. `SettingsScreen`/`ClientsScreen`/`InvoicesScreen`/
`TreasuryScreen`/`ForecastScreen` (l'ancien mock) restent définis dans
`finance-screens.tsx` mais ne sont plus importés nulle part (morts, à
retirer avec le reste du mock au fil des prochaines phases — même précédent
que `SettingsScreen` depuis la Phase 4, jamais nettoyé, laissé pour ne pas
complexifier ce diff).

### Routes métier (Phases 5-9)

| Route | Fonction |
|---|---|
| `/clients`, `/clients/[id]` | Liste + fiche client (CRUD, indicateurs, archivage) |
| `/invoices` | Vue combinée devis + factures, export CSV/FEC |
| `/quotes/new`, `/quotes/[id]` | Création/édition/envoi/duplication/conversion de devis |
| `/quotes/[id]/pdf` | PDF du devis, protégé par session |
| `/public/quotes/[token]` | Consultation publique + acceptation/refus en ligne, sans session |
| `/public/quotes/[token]/pdf` | PDF public par jeton |
| `/invoices/new`, `/invoices/[id]` | Création/édition (brouillon)/émission/envoi/paiement/avoir |
| `/invoices/[id]/pdf` | PDF de la facture, protégé par session |
| `/invoices/export?format=csv\|fec` | Export comptable |
| `/public/invoices/[token]`, `/public/invoices/[token]/pdf` | Consultation publique, sans session |
| `/treasury` | Comptes bancaires, transactions, catégorisation, rapprochement facture↔transaction (Phase 7) — filtres persistés dans l'URL (`?q=&account=&category=`, nuqs) — et depuis la Phase 8, cotisations/impôts estimés, échéances, déclarations de TVA sur la même page (même item de nav que la Phase 7, « Trésorerie & charges ») |
| `/api/files/[id]` | Seul point d'accès aux fichiers uploadés (justificatifs), authentifié + scopé RLS, jamais d'URL publique |
| `/vat/export` | Export CSV des déclarations de TVA préparées |
| `/forecast` | Objectif de CA, pipeline pondéré, projection de trésorerie à 3/6 mois, simulateur de revenu net comparatif (Phase 8) |
| `/time` | Grille hebdomadaire, projets, chrono, conversion temps→facture, TJM effectif, classement clients (Phase 9) |
| `/` | Tableau de bord réel (Phase 9, jamais branché avant) : CA du mois sélectionné, graphique 12 mois, trésorerie à 3 mois, échéances à venir, factures en retard, dépendance client |

### Routes d'authentification (Phase 2, hors du routeur mock ci-dessus)

Vraies pages Next.js (prioritaires sur `app/[...slug]/page.tsx`) :

| Route | Fonction |
|---|---|
| `/login` | Connexion + étape 2FA TOTP si activée |
| `/signup` | Inscription (vérification email obligatoire) |
| `/forgot-password` | Demande de lien de reset |
| `/reset-password?token=` | Choix du nouveau mot de passe |
| `/settings/security` | Compte, mot de passe, 2FA, sessions, email, export RGPD, suppression |
| `/settings` | Entreprise, statuts/périodes, préférences (TJM…), numérotation, thème (Phase 4, remplace le mock) |
| `/settings/fiscal/[year]` | Paramètres fiscaux par année et par statut (Phase 4) |
| `/onboarding` | Première configuration, 5 étapes sautables (Phase 4) |
| `/api/auth/[...all]` | Handler Better Auth (signup/login/reset/verify/2FA/sessions/…) |
| `/api/account/export` | Export JSON du compte (RGPD), protégé par session |

`proxy.ts` protège tout le reste (vérif. optimiste sur le cookie de session,
redirige vers `/login?next=...`) ; `lib/auth/session.ts` fait la vérification
réelle (`getSession`/`requireSession`, appelle la base via Better Auth,
mémoïsé avec `cache()`) — c'est cette dernière qui fait foi partout où une
donnée sensible est en jeu, jamais le cookie seul.

### Boutons/contrôles morts identifiés (liste complète : `AUDIT.md`, produit en Phase 9)

Exemples représentatifs relevés pendant l'audit Phase 0 — tous résolus depuis,
liste conservée ici pour mémoire (catalogue exhaustif et à jour : `AUDIT.md`) :
- ~~Bouton "Cmd K" → ouvre une palette avec 4 actions câblées à rien~~ → recherche
  réelle + actions réelles depuis la Phase 9.
- ~~Sélecteur de période dans le header → état local, ne filtre aucune donnée~~ →
  retiré du header global, remplacé par un vrai sélecteur de mois propre au
  tableau de bord (Phase 9).
- ~~Boutons "Nouvelle facture", "Ajouter un client", "Exporter", "Enregistrer",
  "Préparer le changement", crayon d'édition client~~ → réels depuis les
  Phases 4-6.
- ~~Chrono de `/time` → bascule un booléen~~ → chrono réel, persistant entre
  sessions, accessible depuis n'importe quel écran (Phase 9).
- ~~`ThemeSwitcher` → non persisté~~ → persisté depuis la Phase 4 (limite
  résiduelle : uniquement rechargé sur `/settings`, voir section dédiée).

## Schéma de données (Phase 1)

36 tables dans `db/schema/*.ts` (barrel `db/schema/index.ts`), migrations dans
`drizzle/*.sql` (générées, jamais éditées à la main sauf les migrations
`--custom` explicitement documentées ci-dessous).

- `auth.ts` — **généré par Better Auth CLI**, ne pas éditer : `user`, `session`,
  `account`, `verification`, `two_factor`, `rate_limit`. `user.id` (text) est
  la FK référencée par (quasi) toutes les autres tables pour le cloisonnement
  multi-comptes (Phase 3, voir section dédiée ci-dessous).
- `company.ts` — `companies` (1:1 user, tout nullable), `status_periods`
  (historique de statut juridique, au plus une période ouverte par contrainte
  unique `NULLS NOT DISTINCT` + non-chevauchement garanti par une contrainte
  `EXCLUDE USING gist` sur `daterange(start_date, end_date)`, migration
  `0001_status_periods_no_overlap.sql`, nécessite `btree_gist`),
  `fiscal_param_overrides` (clé/valeur par année+statut, la base fait foi sur
  `lib/fiscal/params/*.ts` — Phase 4), `user_preferences`, `numbering_series` +
  `document_number_counters` (compteur atomique par série/année, verrou
  `SELECT ... FOR UPDATE` à l'émission — Phase 6), `email_templates`.
- `clients.ts` — `clients` (archivage, jamais de suppression physique si des
  documents existent — appliqué au niveau service, pas au niveau schéma).
- `documents.ts` — `quotes`/`quote_lines`, `invoices`/`invoice_lines`,
  `invoice_audit_log`, `invoice_reminders`, `recurring_invoice_templates`/
  `_lines`. **Immuabilité des factures émises appliquée en base**, pas
  seulement côté app (migration `0002_invoice_immutability_and_audit_log.sql`) :
  - trigger `invoices_immutable_once_issued` : bloque toute modification des
    colonnes financières/légales dès que `status <> 'draft'` (seuls
    `status`/`paid_amount_cents`/`notes` restent modifiables, pour les
    paiements et l'annulation) ;
  - trigger `invoices_no_delete_once_issued` : bloque toute suppression d'une
    facture émise (correction = avoir, jamais delete) ;
  - trigger `invoice_lines_immutable_once_issued` : bloque insert/update/delete
    sur les lignes dès que la facture parente n'est plus `draft` ;
  - trigger `invoice_audit_log_append_only` : bloque tout update/delete sur le
    journal d'audit, sans exception, quel que soit le rôle connecté.
  Conséquence pratique pour tout code futur (Phase 6+) : une facture doit être
  créée en `draft`, ses lignes insérées à ce stade, puis une **seule** requête
  `UPDATE ... SET status = ...` fait la transition d'émission — jamais
  d'update combiné touchant aussi les montants une fois `draft` quitté. Le
  seed (`db/seed.ts`) désactive temporairement ces triggers pour se
  réinitialiser proprement (`ALTER TABLE ... DISABLE/ENABLE TRIGGER`) : ne
  reproduis ce pattern que dans un script de seed, jamais dans le code
  applicatif.
  `invoice_audit_log.actor_user_id` n'a **pas** de FK vers `user.id` (retirée
  en Phase 3, migration `0006`) : le journal doit rester une trace fidèle même
  après suppression du compte auteur — voir « Suppression de compte » plus bas.
  La fonction `prevent_issued_invoice_lines_mutation` (migration `0002`) a été
  corrigée en Phase 3 (migration `0007`) : elle ne bloque que si la facture
  parente existe ENCORE et n'est plus `draft` — sinon une suppression en
  cascade légitime (ex. nettoyage de fixtures de test) était bloquée à tort
  quand l'ordre de cascade Postgres supprimait la facture avant ses lignes.
- `treasury.ts` — `bank_accounts`, `transaction_categories`, `category_rules`,
  `transactions` (montant signé), `invoice_payments` (rapprochement, supporte
  les paiements partiels), `deadlines`, `vat_periods`.
- `time.ts` — `projects`, `time_entries` (lien optionnel vers
  `invoice_lines.id` une fois converties), `active_timers` (1 ligne par
  utilisateur, `started_at` non nul = chrono en cours — persiste le minuteur
  entre sessions/appareils, Phase 9).
- `files.ts` — métadonnées des fichiers passant par `lib/storage.ts` (Phase 7).
- `misc.ts` — `rate_limit_buckets` (limitation de débit maison par fenêtre
  fixe, backée Postgres — voir décision Phase 2 ci-dessous),
  `data_export_requests` (RGPD).

## Cloisonnement multi-comptes (Phase 3)

Row Level Security Postgres sur les 28 tables utilisateur (migration
`0004_row_level_security.sql`), **pas** une simple discipline applicative :
même une requête qui « oublie » son `WHERE user_id = …` ne peut renvoyer que
0 ligne. Table directe : `USING (user_id = current_setting('app.user_id', true))`.
Table enfant sans `user_id` propre (ex. `quote_lines`) : `EXISTS (SELECT 1
FROM quotes WHERE quotes.id = quote_lines.quote_id AND quotes.user_id = …)`.
`current_setting(..., true)` renvoie NULL si rien n'est positionné → aucune
ligne ne matche jamais : *deny by default*.

**Point critique, à ne jamais recréer par erreur** : le rôle par défaut Neon
(`neondb_owner`, celui de `DATABASE_URL`) a l'attribut `BYPASSRLS`, comme
**tout rôle créé via l'API/console/MCP Neon** — `FORCE ROW LEVEL SECURITY` sur
les tables ne change rien pour un rôle qui a `BYPASSRLS`, ça n'a d'effet que
sur le propriétaire de la table s'il ne l'a pas. Un rôle créé en **SQL pur**
(`CREATE ROLE ... WITH LOGIN NOBYPASSRLS`, migration `0005_app_scoped_role.sql`)
n'a en revanche pas cet attribut par défaut — c'est le comportement Postgres
standard, confirmé et documenté dans le guide officiel Neon
(neon.com/docs/guides/rls-query-execution). D'où deux rôles/connexions bien
distincts :

| Rôle | Variable | BYPASSRLS | Usage |
|---|---|---|---|
| `neondb_owner` | `DATABASE_URL(_UNPOOLED)` | oui | migrations, seed, adaptateur Better Auth (`db/client.ts`) |
| `app_scoped` | `DATABASE_SCOPED_URL` | **non** | toute requête métier via `lib/db/scope.ts` (`db/scoped-client.ts`) |

`lib/db/scope.ts` expose `withUserScope(userId, fn)` / `withCurrentUserScope(fn)`
(résout la session courante) : ouvre une transaction sur `app_scoped`, exécute
`select set_config('app.user_id', $1, true)` (paramétré, pas d'injection),
puis `fn(tx)`. **Tout code métier (Phases 5+) doit passer par là** — jamais de
requête directe via `db/client.ts` sur une table utilisateur. `mot de passe`
d'`app_scoped` positionné séparément par branche (`ALTER ROLE app_scoped WITH
PASSWORD ...`), jamais committé, jamais dans une migration.

**Tests d'isolation** (`lib/db/__tests__/isolation.test.ts`, contre la branche
Neon `test`, jamais dev/prod) : pour chacune des 28 tables, vérifie qu'une
lecture non scopée renvoie 0 ligne malgré des données existantes ; vérifie
qu'un compte ne peut ni lire, ni UPDATE, ni DELETE une ressource d'un autre
compte (test direct sur `clients`, test sur une table enfant via
`invoice_lines`) ; vérifie qu'un INSERT avec un `user_id` usurpé est rejeté
par la clause `WITH CHECK`. `pnpm test` échoue fort si
`TEST_DATABASE_URL`/`TEST_DATABASE_SCOPED_URL` sont absentes (voir
`.env.example`) plutôt que de sauter silencieusement ces tests.

**Suppression de compte — limite connue, à traiter en Phase 6+** : plusieurs
FK sont volontairement en `RESTRICT` plutôt que `CASCADE`
(`invoices.series_id → numbering_series`, `quotes/invoices/projects/
recurring_invoice_templates.client_id → clients`, `invoice_payments.invoice_id
→ invoices`), pour qu'un compte ayant de l'historique financier ne puisse
jamais disparaître via un simple `DELETE FROM user` — cohérent avec la
conservation légale des factures (dix ans, PROMPT.md « Conformité ») mais ça
veut dire qu'**aujourd'hui, `authClient.deleteUser()` échouera** (violation de
contrainte FK) pour tout compte ayant émis au moins une facture/un devis/un
projet. Tant que Phase 6+ n'a pas construit un vrai service de suppression
(anonymisation des données personnelles + conservation des pièces
comptables — PROMPT.md autorise explicitement l'un ou l'autre), la
suppression de compte ne doit être considérée fonctionnelle que pour un
compte sans aucune donnée métier. Ne pas « corriger » ça en repassant les FK
en `CASCADE` : ce serait perdre des factures, ce que le cahier des charges
interdit explicitement.

## Paramètres fiscaux, entreprise, onboarding (Phase 4)

- `lib/fiscal/param-definitions.ts` — source de vérité unique des paramètres
  fiscaux (clé, libellé, unité `basis_points`|`cents`, statuts concernés).
  `lib/fiscal/params/<année>.ts` en dérive une structure 100 % à `null`
  (documentation/forme, jamais de valeur). `lib/fiscal/get-params.ts`
  (`getFiscalParams(userId, year, status)`) résout les valeurs réelles depuis
  `fiscal_param_overrides` (la base fait foi) et renvoie toujours un résultat
  typé `{ status: 'ok' | 'missing_params', ... }` — jamais d'exception, jamais
  de valeur par défaut. `<MissingParamBanner>` (components/fiscal/) est prêt à
  être posé partout où un calcul dépendra de ces paramètres (Phase 8), pas
  encore utilisé (aucun calcul fiscal n'existe encore).
- Stockage : un paramètre = une ligne (`year`, `status`, `paramKey`, `value`).
  Le formulaire (`fiscal-year-form.tsx`) affiche/saisit en unité humaine (€ ou
  %), l'action (`upsertFiscalParamsAction`) convertit ×100 vers l'unité de
  stockage (centimes/points de base) — champ vide = suppression de l'override
  (retour à "manquant"), jamais une valeur inventée à sa place.
- Statuts juridiques : `createStatusPeriodAction` clôt la période ouverte
  (`endDate = date d'effet - 1 jour`) puis insère la nouvelle, dans la même
  transaction scopée. La contrainte `EXCLUDE` (migration 0001) est le filet de
  sécurité final ; l'action valide aussi côté application pour renvoyer un
  message clair plutôt qu'une erreur Postgres brute. Testé pour le cas
  "exercice à cheval sur deux statuts" (`lib/db/__tests__/status-periods.test.ts`).
- Onboarding (`/onboarding`, `lib/onboarding/steps.ts`) : 5 étapes
  (entreprise, statut, numérotation, préférences, paramètres fiscaux de
  l'année), chacune "Configurer" (marque fait + lien) ou "Passer" (marque
  ignoré), état dans `user_preferences.onboarding_completed_steps` (jsonb).
  Jamais imposé : aucune redirection forcée vers `/onboarding`.
- Thème (`ThemeSwitcher`) persisté dans `user_preferences.theme`, mais
  **uniquement rechargé sur la page `/settings`** (`FinanceShell` accepte un
  prop `initialTheme` optionnel, seule cette page le fournit pour l'instant) :
  faire persister le thème à travers toute la navigation demanderait de
  remonter `FinanceShell`/`ThemeContext` dans un layout partagé (actuellement
  chaque page l'instancie individuellement, donc il se réinitialise à `sauge`
  à chaque changement de route) — refonte plus large, hors du périmètre de
  cette phase, à reprendre si le confort visuel devient prioritaire (Phase 9+).

## Clients, devis, PDF, consultation publique (Phase 5)

- **Clients** (`/clients`, `/clients/[id]`, `lib/clients/`) : CRUD complet,
  détection de doublons (SIRET ou nom identique, confirmation explicite pour
  passer outre), indicateurs calculés à la volée (CA cumulé, encours, délai
  de paiement moyen, part du CA total avec seuil "dépendance" à 30 % — seuil
  d'affichage UI, pas une valeur fiscale, donc pas concerné par l'interdiction
  d'inventer). Suppression physique **uniquement** si aucun devis/facture/
  projet/modèle récurrent n'y est rattaché, sinon redirigée vers l'archivage
  (`archivedAt`) — jamais de perte de document lié.
- **Devis** (`/quotes/new`, `/quotes/[id]`, `lib/quotes/`) : lignes
  réordonnables (boutons monter/descendre plutôt que drag-and-drop — même
  résultat fonctionnel, pas de dépendance dnd-kit pour ça), remise en %,
  cycle de statuts `draft → sent → accepted/refused/expired`, duplication,
  conversion en facture **brouillon** (l'émission avec numérotation reste
  Phase 6). Expiration : pas encore de cron (Phase 10) — `listQuotes()` bascule
  en lecture les devis `sent` dont `validUntil` est dépassée avant de
  renvoyer la liste, donc jamais affiché comme "envoyé" indéfiniment après
  péremption, sans dépendre d'une tâche planifiée pour l'instant.
- **Numérotation partagée** (`lib/documents/numbering.ts`) : `getNextDocumentNumber`
  incrémente atomiquement via `INSERT ... ON CONFLICT DO UPDATE SET n = n + 1`
  (atomique sous Postgres, pas besoin de `SELECT ... FOR UPDATE` explicite).
  Utilisée pour les devis dès maintenant, et réutilisée telle quelle pour les
  factures en Phase 6 — **test de concurrence déjà écrit et vert**
  (`lib/documents/__tests__/numbering.test.ts`, 20 appels concurrents →
  20 numéros distincts et consécutifs), en avance sur l'exigence explicite de
  PROMPT.md pour les factures.
- **PDF** (`lib/documents/`) : interface `DocumentExporter<T>` (`exporter.ts`),
  implémentation "classique" avec `@react-pdf/renderer`. Piège rencontré :
  `@fontsource/*` ne fournit que du woff/woff2, que le sous-ensembleur de
  polices de react-pdf (fontkit) ne sait pas ré-encoder de façon fiable à
  l'embarquement PDF (`Offset is outside the bounds of the DataView`) — il
  faut du `.ttf`. Récupéré une fois depuis Google Fonts et vendorisé dans
  `assets/fonts/` (voir `lib/documents/fonts.ts`) plutôt que refetché à
  chaque build. `InvoiceExporter` (Phase 6) réutilisera cette même interface
  et cette même config de polices pour les factures.
- **Consultation publique** (`/public/quotes/[token]`, `/public/quotes/[token]/pdf`) :
  accessible sans session (`proxy.ts`, `ALWAYS_PUBLIC_ROUTES`), jeton
  UUID non devinable comme seule clé d'accès. `respondToPublicQuoteAction`
  utilise volontairement `db` (connexion admin, contourne la RLS) plutôt que
  `withUserScope` : il n'y a pas de session côté visiteur, donc pas
  d'`app.user_id` possible — la clause `WHERE publicToken = ...` fait office
  de garde à la place. IP capturée (`x-forwarded-for`) à l'acceptation pour
  l'horodatage exigé par PROMPT.md.
- **Vérification** : `lib/money.ts` et le PDF exporter ont leur suite Vitest
  (arrondi ligne par ligne, cas limites). Le cycle complet devis (création →
  envoi/numérotation → acceptation publique → conversion facture) a été
  exercé directement contre la branche `test` via script ad hoc (nettoyé
  après coup) — les Server Actions elles-mêmes n'ont pas pu être testées en
  navigateur cette session (voir décision Phase 4 sur la collision de cookies
  entre projets locaux sur `localhost`) ; leur logique est néanmoins identique
  à celle exercée par le script (mêmes fonctions `withUserScope`/`getNextDocumentNumber`/
  `computeDocumentTotals` sous-jacentes).
- `settings`, `clients` et `invoices` retirés du routeur mock
  (`app/[...slug]/page.tsx`) : `/invoices` est maintenant une vraie route
  listant devis + factures (les factures restent en lecture seule tant que
  la Phase 6 n'a pas construit leur cycle de vie complet).

## Factures (Phase 6)

**La partie la plus sensible du cahier des charges** — traitée avec le même
niveau de rigueur que l'architecture le permettait déjà (triggers Postgres
Phase 1, numérotation atomique testée en concurrence Phase 5).

- **Émission** (`issueInvoiceAction`, `lib/invoicing/actions.ts`) : une seule
  transaction scopée qui (1) résout le statut juridique EN VIGUEUR à la date
  d'émission (`getStatusPeriodAtDate`, jamais le statut "actuel"), (2) résout
  les mentions légales (`resolveLegalMentions`, fonction pure testée
  unitairement avec des paramètres fictifs explicites — jamais de valeur
  réelle en dur), (3) réserve le numéro (`getNextDocumentNumber`, la même
  fonction que les devis, déjà testée en concurrence Phase 5), (4) fige tout
  dans `legal_snapshot` (jsonb). Fonctionne même sans entreprise/statut
  configuré : émet quand même, journalise les mentions manquantes dans
  `invoice_audit_log.metadata`, l'interface les affiche après coup — jamais
  de blocage, jamais de valeur inventée à la place.
- **Immuabilité — vérifiée activement, pas seulement supposée** : un script
  de vérification (voir journal ci-dessous) a tenté de modifier les montants
  d'une facture émise via `withUserScope` (rejeté par le trigger) ET de la
  supprimer via la connexion **admin** qui contourne la RLS (rejetée quand
  même — le trigger d'immuabilité ne dépend pas du rôle Postgres connecté,
  contrairement à la RLS). C'est la garantie que PROMPT.md demande : aucun
  chemin de code, même privilégié, ne peut altérer une facture émise.
- **Avoirs** : `cancelInvoiceAction` (avoir total = mêmes lignes exactes que
  l'originale, statut original → `cancelled`) et `createCreditNoteAction`
  (lignes libres). Numérotés dans leur propre série (`kind: 'credit_note'`,
  préfixe `A`). Un avoir est inséré en `draft` puis immédiatement passé à
  `issued` en deux étapes dans la même transaction — pas par choix de
  workflow (l'utilisateur ne voit jamais cet état intermédiaire) mais parce
  que le trigger d'immuabilité des lignes exige que la facture parente soit
  encore `draft` au moment où ses lignes sont insérées.
- **CA et encours** (`lib/clients/queries.ts`, `invoices-overview-screen.tsx`)
  soustraient désormais les avoirs plutôt que de les additionner (somme
  signée SQL) : un avoir de 100 € réduit le CA du client de 100 €, il ne
  s'y ajoute jamais.
- **Paiements** : `recordPaymentAction` insère `invoice_payments` (pas encore
  relié à une transaction bancaire — Phase 7) et fait passer le statut à
  `partially_paid` ou `paid` selon le solde. Relances (`sendReminderAction`) :
  manuelles pour l'instant, la "proposition automatique" se fait par lecture
  paresseuse (`listInvoices` bascule en `overdue` les factures échues non
  soldées à chaque affichage de la liste, comme l'expiration des devis) en
  attendant le vrai cron (Phase 10).
- **PDF** : `InvoiceExporter` (`lib/documents/invoice-exporter.ts`) implémente
  `DocumentExporter<T>` (même interface que les devis, Phase 5), toujours en
  PDF "classique" — ni XML CII ni PDF/A-3 Factur-X (PROMPT.md le demande
  explicitement en l'état). Le schéma porte déjà les champs Factur-X
  (`buyer_reference`, `payment_means_code`, `vat_category_code` par ligne,
  `reverse_charge`) pour qu'une implémentation future substitue l'exporteur
  sans toucher au code appelant.
- **Export comptable** (`lib/invoicing/accounting-export.ts`) : CSV simple +
  FEC (format réglementaire français, tabulations, une écriture équilibrée
  débit/crédit par facture — 411 Clients / 706 Ventes / 445711 TVA collectée,
  inversée pour un avoir). Ces trois comptes sont une classification du Plan
  Comptable Général standard, pas un paramètre propre à l'utilisateur — donc
  pas concernés par l'interdiction d'inventer des taux/barèmes. Testé :
  chaque écriture s'équilibre exactement (`lib/invoicing/__tests__/accounting-export.test.ts`).
- **Mentions légales manquantes** : trois nouveaux champs sur `companies`
  (`default_escompte_conditions`, `default_late_penalty_rate_basis_points`,
  `default_late_recovery_indemnity_cents`, migration 0009), saisissables
  depuis `/settings`. Absents par défaut, comme tout le reste — jamais de
  barème légal deviné à leur place.

## Trésorerie (Phase 7)

Aucune migration nécessaire : le schéma (`bank_accounts`, `transaction_categories`,
`category_rules`, `transactions`, `invoice_payments`) est posé depuis la
Phase 1 et couvert par la RLS depuis la Phase 3 (migration 0004) — cette
phase n'ajoute que `lib/treasury/`, `lib/storage.ts`, `lib/uploads.ts`,
`app/treasury/`, `app/api/files/[id]/` et deux relations Drizzle
(`transactionCategoriesRelations`, `categoryRulesRelations`,
`transactions.invoicePayments`) nécessaires pour que le query builder
relationnel (`tx.query.*.findMany({ with: ... })`) les résolve.

- **Comptes et solde** : `listBankAccounts` (`lib/treasury/queries.ts`)
  calcule le solde = `opening_balance_cents` + somme signée des transactions
  du compte (SQL, pas en mémoire). Archivage (pas de suppression) comme les
  clients.
- **Catégorisation automatique** : une règle (`category_rules.match_pattern`)
  s'applique si son motif est une sous-chaîne (insensible à la casse) du
  libellé de la transaction, testée à la création si aucune catégorie n'est
  choisie explicitement. Volontairement simple (substring, pas de regex/ML) —
  PROMPT.md ne demande rien de plus sophistiqué.
- **Rapprochement facture ↔ transaction** (`reconcileTransactionAction`) :
  réutilise le même calcul de statut que `recordPaymentAction` (Phase 6),
  mais **recalculé localement** (`computeInvoiceStatusAfterPayment` dans
  `lib/treasury/actions.ts`) plutôt qu'importé — un fichier `'use server'` ne
  peut exporter que des fonctions async, donc pas de helper synchrone partagé
  sans un fichier dédié pour 3 lignes. Différence volontaire avec Phase 6 :
  ce calcul tient compte de l'échéance dépassée (`overdue`) pour couvrir le
  cas d'une **annulation** de rapprochement (`removeInvoicePaymentAction`) ou
  la suppression d'une transaction rapprochée (`deleteTransactionAction`) —
  dans les deux cas le solde facture redescend et le statut doit pouvoir
  redevenir `overdue`, pas seulement `issued`/`partially_paid`.
- **Suppression d'une transaction rapprochée** : jamais de solde facture
  orphelin. `deleteTransactionAction` retrouve tous les `invoice_payments`
  liés, décrémente `paid_amount_cents` de chaque facture concernée, recalcule
  son statut, supprime les paiements puis la transaction — le tout dans une
  seule transaction Postgres scopée. Vérifié par script ad hoc contre la
  branche `test` (voir ci-dessous) : paiement partiel → total → suppression
  de la transaction reconnectée → la facture revient exactement à son état
  intermédiaire (montant et statut), jamais à zéro.
- **Justificatifs** (`lib/storage.ts`, `lib/uploads.ts`) : stockage derrière
  une interface unique — filesystem local (`.uploads/`, gitignored) en dev,
  Vercel Blob en **accès privé** (`access: 'private'`, jamais `'public'` —
  justificatifs = documents financiers sensibles) si `BLOB_READ_WRITE_TOKEN`
  est présent. Aucune URL Blob n'est jamais exposée côté client : le seul
  point d'accès est `app/api/files/[id]/route.ts`, qui relit le fichier via
  `readStoredFile` après une requête scopée RLS (un autre utilisateur ne peut
  pas deviner l'id d'un fichier qui n'est pas à lui — la RLS le rend
  invisible, pas juste "non lié"). Validation upload (`lib/uploads.ts`) :
  taille max 10 Mo, et **signature binaire réelle** vérifiée (magic bytes
  JPEG/PNG/WebP/PDF), pas seulement le `Content-Type` déclaré par le
  navigateur — conforme à l'exigence PROMPT.md ("type MIME vérifié côté
  serveur"). Aucun SVG accepté (vecteur exécutable côté navigateur).
- **Filtres persistés dans l'URL** : premier vrai usage de `nuqs` dans le
  projet (dépendance déjà présente depuis la Phase 0, jamais branchée) —
  `NuqsAdapter` ajouté à `app/layout.tsx` (manquait). `TransactionsPanel`
  (`?q=&account=&category=`) est le seul écran de recherche/filtre du projet
  à être réellement partageable par URL pour l'instant ; `ClientsListScreen`
  (Phase 5) reste en filtrage local (`useState`), pas rétrofité par cette
  phase pour limiter le diff — à harmoniser plus tard si PROMPT.md le
  redemande explicitement.
- **Vérification** : suite Vitest inchangée (aucun nouveau test unitaire pur
  — pas de nouvelle fonction de calcul isolée, contrairement à `lib/money.ts`
  ou `legal-mentions.ts`), mais script ad hoc (`tsx`, supprimé après coup)
  exécuté contre la branche Neon `test` : auto-catégorisation par règle,
  calcul de solde, rapprochement partiel puis total (transitions de statut),
  suppression d'une transaction rapprochée (reversion correcte), isolation
  RLS entre deux utilisateurs. `pnpm typecheck && pnpm lint && pnpm test &&
  pnpm build` verts. Page `/treasury` vérifiée par un vrai signup + login via
  curl (cookie jar isolé) contre le serveur de dev — nettoyé après coup
  (compte de test supprimé de la branche `production`, lignes `verify-treasury-%`
  supprimées de la branche `test`).

## Charges, échéances, TVA, prévisionnel (Phase 8)

Deux colonnes nullables ajoutées (migration 0010, aucune contrainte NOT NULL,
absentes par défaut comme tout paramètre business non fiscal) :
`quotes.win_probability_basis_points` (pondération du pipeline) et
`user_preferences.annual_revenue_goal_cents` (objectif de CA). Le reste
réutilise le schéma déjà posé en Phase 1 (`deadlines`, `vat_periods`) et
l'infrastructure fiscale de la Phase 4 (`getFiscalParams`,
`MissingParamBanner`, `lib/fiscal/param-definitions.ts`).

- **Calculs, dans `lib/fiscal/`, purs et testés** (`compute-charges.ts`,
  `forecast.ts`) — jamais appelés tant que `getFiscalParams` renvoie
  `missing_params` :
  - `computeMicroCharges` : cotisations + formation pro + versement
    libératoire (un taux à 0 signifie simplement l'option non exercée, pas
    un cas à traiter à part) sur le CA **encaissé**, jamais facturé.
  - `computeCompanyCharges` (EURL/SASU) : IS par tranches (taux réduit puis
    normal), puis cotisations dirigeant sur le résultat net. **Simplification
    assumée et documentée dans le code** : bénéfice imposable = CA fourni
    (aucune charge déductible modélisée dans l'app), 100 % du résultat net
    supposé versé en rémunération — un comparatif d'ordre de grandeur entre
    statuts, pas une liasse fiscale ni un bulletin de paie.
  - `computeThresholdGauge` : jauge générique (plafond micro, franchise TVA),
    réutilisée pour les deux seuils.
  - `computeWeightedPipeline` : un devis sans probabilité saisie compte pour
    100 % — jamais de probabilité inventée à sa place.
  - `projectCashflow` : solde actuel + encours dont l'échéance tombe dans la
    fenêtre - charges estimées dans la même fenêtre ; une facture sans
    échéance ou une charge sans montant estimé est ignorée, jamais devinée.
- **CA encaissé et TVA collectée** (`lib/fiscal/queries.ts`,
  `lib/vat/queries.ts`) : calculés depuis `invoice_payments`/`invoices`
  directement en base (sommes signées, un avoir soustrait), jamais saisis à
  la main — pour qu'ils ne puissent jamais diverger des documents réels.
- **TVA déductible** : reste saisie manuellement lors de la préparation
  d'une déclaration (`prepareVatPeriodAction`). L'application ne capture
  aucun taux de TVA sur les dépenses (les transactions de trésorerie,
  Phase 7, ont une catégorie mais pas de ventilation TVA) : il n'y a donc
  rien d'où la déduire automatiquement sans l'inventer. Une déclaration
  `filed` devient immuable (édition et suppression refusées).
- **Régime de TVA "à bascule datée"** : déjà couvert nativement depuis la
  Phase 4, pas de nouveau mécanisme — `vat_regime` est une colonne de
  `status_periods`, donc ouvrir une nouvelle période avec le même statut mais
  un régime différent (formulaire déjà existant dans `/settings`) EST le
  changement de régime daté demandé par PROMPT.md.
- **Échéances** : CRUD + rappel email (`lib/deadlines/`). Le rappel reste
  déclenché manuellement (bouton) faute de tâche planifiée — même choix que
  les relances de factures en Phase 6, le vrai cron arrive en Phase 10.
- **Simulateur de revenu net** : `NetIncomeSimulator` calcule côté client à
  chaque déplacement du slider (fonctions pures importées telles quelles,
  aucun aller-retour serveur) — mais les **paramètres fiscaux** (taux) sont
  résolus côté serveur par utilisateur/année/statut avant l'hydratation :
  jamais un taux du navigateur, seule la variable CA l'est. Un statut sans
  paramètres complets affiche son propre `MissingParamBanner` dans sa
  colonne, sans bloquer les deux autres.
- **Pipeline pondéré** : `setQuoteWinProbabilityAction` ajouté à
  `lib/quotes/actions.ts` (pas un nouveau module) — c'est une mutation du
  champ `quotes.win_probability_basis_points`, à sa place naturelle à côté
  des autres actions sur les devis.
- **IA de navigation** : `/treasury` reste l'unique destination "Trésorerie
  & charges" du menu (comptes, transactions, catégorisation, rapprochement
  DEPUIS la Phase 7 ; cotisations, échéances, TVA DEPUIS la Phase 8) —
  reflète le mock d'origine qui combinait déjà tout ça sur un seul écran.
  `/forecast` reste une destination séparée, cohérent avec le nav existant.
- **Vérification** : 14 nouveaux tests Vitest purs (`compute-charges.test.ts`,
  `forecast.test.ts`, données entièrement fictives, jamais un taux réel) +
  script ad hoc contre la branche `test` (supprimé après coup) : résolution
  `missing_params` → `ok` une fois les paramètres saisis, CA encaissé
  correctement filtré par fenêtre de dates, TVA collectée nette d'un avoir,
  pipeline pondéré, isolation RLS. `pnpm typecheck && pnpm lint && pnpm test
  && pnpm build` verts. `/treasury` et `/forecast` vérifiés par un vrai
  signup + login via curl contre le serveur de dev, nettoyé après coup.

## Temps, recherche, palette de commandes, tableau de bord réel (Phase 9)

Aucune migration : `projects`/`time_entries`/`active_timers` posés en Phase 1,
couverts par la RLS depuis la Phase 3. Un bug de double-comptage a été trouvé
et corrigé en écrivant le script de vérification (voir ci-dessous) — documenté
ici pour ne pas le réintroduire.

- **Temps et rentabilité** (`lib/time/`, `/time`) : grille hebdomadaire (lundi
  en premier, navigation `?week=` persistée), projets (CRUD, TJM cible),
  distinction facturable/non facturable, chrono persistant.
  - **Chrono global** (`components/time/global-timer.tsx`, monté dans
    `FinanceShell`) : accessible depuis n'importe quel écran, pas seulement
    `/time`. Un Client Component ne peut pas importer une query `server-only`
    directement — `getTimerWidgetDataAction` (Server Action) sert de pont pour
    la lecture initiale (timer actif + liste des projets), comme
    `listUnconvertedEntriesAction` pour le dialogue de conversion. `stopTimerAction`
    calcule la durée réellement écoulée (`Date.now() - startedAt`) et crée
    l'entrée de temps correspondante, toujours facturable par défaut,
    modifiable ensuite comme n'importe quelle entrée.
  - **Conversion temps → facture** (`convertTimeEntriesToInvoiceAction`) :
    regroupe les entrées facturables sélectionnées d'un projet en **une seule
    ligne** d'une facture brouillon (TJM = celui du projet, sinon celui du
    client, sinon erreur explicite — jamais de taux inventé). Le **taux de
    TVA n'est jamais défaulté** : contrairement au reste de la conversion
    (entièrement automatique), c'est le seul champ que l'utilisateur doit
    obligatoirement saisir dans le petit formulaire de conversion, exactement
    comme il le ferait pour n'importe quelle ligne de facture manuelle —
    single-click pour tout le reste, jamais pour la TVA.
  - **Bug trouvé et corrigé (double comptage du TJM effectif)** : plusieurs
    entrées de temps peuvent partager la **même** ligne de facture (une
    conversion regroupe N entrées → 1 ligne). `getProjectsProfitability`
    sommait `invoiceLine.lineTotalHtCents` **par entrée** au lieu de par ligne
    unique, comptant le montant facturé une fois par entrée contributrice —
    un projet avec 2 entrées converties ensemble voyait son TJM effectif
    doublé. Corrigé par déduplication (`Map` par `invoiceLine.id`) avant de
    sommer. Détecté uniquement parce que le script de vérification (ad hoc,
    contre la branche `test`) comparait le résultat à un calcul à la main —
    aucun test unitaire pur n'existe pour cette fonction (elle fait des
    requêtes DB, pas une fonction pure isolée comme `lib/fiscal/`).
- **Recherche globale + palette de commandes** (`lib/search/actions.ts`,
  `components/command-palette.tsx`) : une seule surface (choix assumé, documenté
  dans `AUDIT.md`) — recherche réelle sur clients/devis/factures/projets
  (ILIKE, scopée RLS, debounce 250 ms) + actions rapides vers de vraies
  destinations (`/invoices/new`, `/clients`, `/time`, `/settings/security`).
  Raccourci global Cmd/Ctrl K (`document.addEventListener('keydown', ...)`
  dans `FinanceShell`) + Échap pour fermer, documentés dans `/settings`
  (nouvelle carte "Raccourcis clavier").
- **Toasts avec annulation** (`components/ui/toast.tsx`, `ToastProvider` dans
  `app/layout.tsx`) : composant maison plutôt qu'une lib tierce (sonner, etc.)
  pour respecter le design brutaliste sans avoir à le resurfacer par-dessus un
  système visuel étranger. Appliqué aux suppressions **réversibles et sans
  effet de bord complexe** (échéance, catégorie + ses règles, entrée de temps
  non convertie) : la donnée est capturée côté client avant suppression, et
  "Annuler" la réinsère telle quelle (même id) via une action `restore*`
  dédiée. Sciemment **pas** appliqué à la suppression d'une transaction
  rapprochée (Phase 7) : annuler proprement une transaction qui a déjà
  recalculé le solde d'une ou plusieurs factures demanderait de rejouer tout
  l'historique de rapprochement, pas juste réinsérer une ligne — hors de
  portée raisonnable ici, documenté comme limite assumée dans `AUDIT.md`
  plutôt que bricolé à moitié.
- **Confirmations fortes** (`components/ui/strong-confirm.tsx`, nouveau
  composant partagé) : réservées aux actions à conséquence réelle et
  difficile à défaire. Un vrai trou a été trouvé en auditant : **l'annulation
  d'une facture émise (avoir total) n'avait aucune confirmation**, pas même
  un `confirm()` natif — corrigé (saisie du numéro de facture). Les
  suppressions déjà fortes existantes (client, compte) restent sur leur
  implémentation ad hoc d'origine (Phases 2 et 5) plutôt que refactorées vers
  le nouveau composant partagé, pour ne pas retoucher du code qui marche et
  est déjà testé sans bénéfice fonctionnel direct.
- **Tableau de bord réel** (`/`, `lib/dashboard/`) : en auditant l'app pour
  Phase 9, découverte que `app/page.tsx` n'avait **jamais** été branché sur de
  vraies données depuis la Phase 0 — le tout premier écran vu après connexion
  était resté intégralement en dur (CA, graphique, échéances, dépendance
  client, tout). Aucune phase du plan ne listait explicitement "tableau de
  bord", mais PROMPT.md est sans ambiguïté ("aucune donnée en dur") et c'est
  l'écran le plus visible de l'app : converti maintenant plutôt que laissé tel
  quel jusqu'à la Phase 10.
  - CA du mois + variation, graphique 12 mois : `lib/fiscal/queries.ts`
    (`computeRealizedCa`, déjà utilisé Phase 8) mois par mois.
  - Trésorerie à 3 mois (graphique 3 points) : réutilise
    `getCashflowProjection` (Phase 8, `lib/forecast/queries.ts`) à 30/60/90
    jours — même moteur que la page Prévisionnel, pas de logique dupliquée.
  - Dépendance client : agrégation groupée par client sur les factures
    émises (somme signée, avoirs soustraits), jamais un tour de boucle par
    client — message neutre tant qu'il n'y a pas assez de factures pour que
    "concentration du CA" veuille dire quelque chose.
  - **Ancien sélecteur de "période"** (`AOÛT 2025`/`JUILLET 2025`/`EXERCICE
    2025` en dur, mort depuis la Phase 0, item du tout premier audit) : retiré
    du header global (`FinanceShell` accepte maintenant un slot
    `headerControl?: ReactNode` optionnel, vide sur tous les écrans sauf un)
    et remplacé par un vrai sélecteur de mois **propre au tableau de bord**
    (`components/dashboard-month-select.tsx`, 12 derniers mois réels,
    persisté dans l'URL `?month=`) plutôt que rendu "fonctionnel" globalement
    sur des écrans hétérogènes où "période" n'a pas de sens unique (clients,
    factures, temps ont déjà chacun leur propre notion de filtre/période).
- **Navigateur réel non utilisé pour la vérification interactive** (chrono,
  palette, grille hebdo) : en ouvrant un onglet MCP vers `localhost:3000/time`,
  le navigateur a affiché un formulaire de connexion avec un email et un mot
  de passe **déjà pré-remplis par le gestionnaire de mots de passe de Chrome**
  (`thoxicx7@gmail.com`, sans rapport avec ce projet) — signe que ce profil
  Chrome partagé contient de vraies identifiants personnels. Onglet fermé
  immédiatement sans rien saisir ni soumettre. Vérification faite autrement :
  script ad hoc contre la branche `test` (chrono démarrer/arrêter, conversion
  en facture avec le taux de TVA fourni, TJM effectif après le correctif de
  déduplication, isolation RLS — 9 assertions) + curl authentifié pour
  confirmer que chaque page rend les bonnes sections HTML. Même précaution
  que la collision de cookies documentée en Phase 4 : ce poste partage son
  navigateur entre plusieurs contextes, jamais fiable pour une vérification
  qui pourrait toucher un compte qui n'est pas celui de ce projet.
- **Vérification** : 9 assertions contre la branche `test` (chrono, conversion
  temps→facture avec TVA fournie par l'utilisateur, TJM effectif dédupliqué,
  isolation RLS) + 6 assertions supplémentaires pour les agrégations du
  tableau de bord (comparaison mensuelle, dépendance client, isolation RLS).
  `pnpm typecheck && pnpm lint && pnpm test && pnpm build` verts (73 tests
  unitaires, inchangés — aucune nouvelle fonction pure isolée cette phase, les
  agrégations sont des requêtes DB testées par script ad hoc comme le reste
  de la couche données). `/time`, `/treasury`, `/` (états vide et avec
  données réelles) vérifiés via curl authentifié contre le serveur de dev,
  comptes de test et données de démonstration supprimés après coup (branches
  `production` et `test`).

## Journal des décisions

- **Phase 0** — Projet Neon `argentbrut` déjà présent sur le compte connecté
  (créé le jour même) : réutilisé en Phase 1, pas de nouveau projet créé. Pas
  de blocage sur l'accès Neon : la chaîne de connexion sera récupérée via
  l'intégration Neon directement en Phase 1.
- **Phase 0** — Aucune donnée d'entreprise/fiscale fournie, conformément au
  cahier des charges : normal, non bloquant, sera saisi depuis l'interface.
- **Phase 0** — `RESEND_API_KEY` et `BLOB_READ_WRITE_TOKEN` absents : non
  bloquant. Resend dégrade vers console + `.mail/`. Le stockage utilise le
  filesystem local en dev (`lib/storage.ts`, Phase 7) ; Blob n'est requis
  qu'au déploiement Vercel, qui reste du ressort de l'utilisateur.
- **Phase 1** — Connexion Neon récupérée via le MCP (`get_connection_string`),
  écrite dans `.env.local` (gitignored). Pooled = `DATABASE_URL` (runtime),
  direct = `DATABASE_URL_UNPOOLED` (drizzle-kit). Pas d'intervention utilisateur
  nécessaire.
- **Phase 1** — `eslint@10` casse avec `eslint-plugin-react@7.37.5`
  (`contextOrFilename.getFilename is not a function`, API retirée d'ESLint 10)
  alors qu'`eslint-config-next@16.3.6` en dépend. **Épinglé `eslint@^9`**
  (peer range `eslint-config-next` : `>=9.0.0`, donc valide) le temps que
  l'écosystème Next rattrape ESLint 10.
- **Phase 1** — Vérification anti mot de passe compromis (exigée par
  PROMPT.md) implémentée **localement** (liste embarquée, Phase 2), pas via
  l'API HaveIBeenPwned : un appel à ce service enverrait des données à un
  tiers, ce que les règles d'arrêt du projet exigent de valider avant de le
  faire. Décision autonome pour rester dans le périmètre "aucun envoi externe
  sans validation", pas un blocage.
- **Phase 1** — Rate limiting implémenté via une table Postgres maison
  (`rate_limit_buckets`, fenêtre fixe) plutôt qu'Upstash/Redis : évite une
  dépendance Marketplace non demandée pour un besoin simple. À revisiter si le
  volume réel le justifie.
- **Phase 1** — Immuabilité des factures émises et inaltérabilité du journal
  d'audit imposées **par triggers Postgres**, en plus de la couche service
  applicative prévue Phase 6 (défense en profondeur — voir section Schéma).
- **Phase 1** — Colonne `status_period_id` volontairement absente sur
  `invoices` : le statut légal en vigueur à la date d'émission est résolu à
  l'écriture puis figé dans `legal_snapshot` (jsonb), pas via FK vers
  `status_periods`. Plus simple, et l'immutabilité de la facture rend la
  traçabilité par FK secondaire.
- **Phase 2** — Authentification complète implémentée et testée de bout en
  bout (signup → email de vérification dégradé → clic → login → 2FA →
  sessions → changement d'email/mot de passe → export → suppression), en
  local (curl + navigateur réel) contre la base Neon. Détail des choix :
  - **Mot de passe compromis** : liste locale de 483 mots de passe ≥ 12
    caractères (`lib/auth/common-passwords.ts`), dérivée hors ligne d'un jeu
    de données public de fuites (SecLists xato-net-10-million-passwords),
    filtrée/normalisée une fois pour toutes. Vérifiée dans une Server Action
    (`lib/auth/actions.ts`) AVANT d'appeler `auth.api.signUpEmail`/
    `resetPassword`/`changePassword` — aucun appel réseau au runtime pour
    cette vérification.
  - **Rate limiting** : finalement branché sur le rate limiter **intégré**
    de Better Auth (`rateLimit: { enabled: true, storage: 'database' }`,
    table `rateLimit` générée par la CLI), pas sur `rate_limit_buckets` —
    ses règles par défaut (connexion/inscription : 3/10s ; reset/renvoi de
    vérification : 3/60s) couvrent exactement ce que demande PROMPT.md.
    Testé manuellement (curl) : 4ᵉ tentative de connexion → 429. `misc.ts`
    garde `rate_limit_buckets`, réservée à un usage hors-auth futur (ex.
    anti-devinette de token public de consultation, Phase 5/6).
  - **CSRF** : géré nativement par Better Auth (vérification de l'en-tête
    `Origin` sur toute mutation), constaté en testant sans cet en-tête
    (`MISSING_OR_NULL_ORIGIN`). Rien à ajouter côté app.
  - **Changement d'email** : Better Auth n'envoie qu'un seul type d'email
    selon l'état (confirmation à l'ancienne adresse OU vérification à la
    nouvelle). Pour satisfaire "confirmation sur l'ancienne ET la nouvelle"
    (PROMPT.md), `sendChangeEmailConfirmation` (lib/auth.ts) envoie
    manuellement les deux : lien d'action à l'ancienne adresse (celle qui
    fait foi), avis informatif à la nouvelle.
  - **Suppression de compte** : `user.deleteUser.enabled` + email de
    confirmation à usage unique (24h) = la "confirmation forte". Doublée
    d'une confirmation UI (taper son email exact) avant même d'envoyer la
    demande. Export de données proposé juste au-dessus dans la même page.
    ⚠️ Mise à jour Phase 3 : ce flux ne fonctionnera plus dès qu'un compte a
    de l'historique financier (contraintes FK volontaires, voir section
    « Cloisonnement multi-comptes » ci-dessus) — actuellement fonctionnel
    uniquement pour un compte sans données métier.
  - **Export RGPD (Phase 2)** : `/api/account/export` couvre aujourd'hui
    profil + entreprise + statuts + préférences (tout ce qui existe en base
    à ce stade) ; à étendre phase après phase à mesure que clients/devis/
    factures/etc. arrivent (Conformité, PROMPT.md).
  - **2FA TOTP** : QR code généré côté client avec `qrcode` (nouvelle
    dépendance, petite, pas d'alternative déjà installée) à partir du
    `totpURI` renvoyé par `authClient.twoFactor.enable`. Codes de
    récupération affichés une seule fois à l'activation.
  - **Proxy vs DAL** : `proxy.ts` ne fait qu'une vérification optimiste
    (présence du cookie, `better-auth/cookies#getSessionCookie`) — c'est
    volontaire (voir doc Next.js citée en tête de fichier) : la vérité vient
    toujours de `lib/auth/session.ts`.
  - Nouveaux items de nav dans `finance-shell.tsx` : lien "Sécurité"
    (`/settings/security`) et bouton "Déconnexion" (`authClient.signOut()`),
    absents du design original — ajoutés dans le même style que le reste du
    sidebar (icônes Lucide, mêmes classes).
- **Phase 3** — Cloisonnement multi-comptes implémenté par Row Level Security
  Postgres (pas seulement applicatif) : voir section dédiée ci-dessus pour le
  détail. Points saillants du journal, au-delà de ce qui y est déjà écrit :
  - Branche Neon `test` créée spécifiquement pour ces tests d'intégration
    (copie-sur-écriture de `production` à l'instant T) plutôt que de risquer
    d'exécuter des tests contre la base de dev — les deux doivent recevoir
    les mêmes migrations désormais (voir section Stack).
  - Piège Neon découvert en testant : un rôle créé via l'API/MCP Neon a
    `BYPASSRLS` par défaut, ce qui rendait la RLS totalement inopérante en
    silence (aucune erreur, juste toutes les lignes visibles) — détecté
    uniquement parce que les tests d'isolation ont échoué de façon suspecte
    (16 lignes vues au lieu de 1). Confirmé par la doc officielle Neon
    (rls-query-execution.md) après investigation. Rôle recréé en SQL pur
    (`CREATE ROLE ... NOBYPASSRLS`), qui n'a pas ce comportement.
  - En creusant le nettoyage des fixtures de test, découverte que la
    suppression d'un compte avec historique financier casse aujourd'hui
    (contraintes RESTRICT + trigger d'immuabilité mal ordonné avec les
    cascades) — corrigé pour le trigger (migration 0007), documenté comme
    limitation connue pour les contraintes RESTRICT (intentionnelles, voir
    ci-dessus).
- **Phase 4** — Paramètres fiscaux, entreprise, périodes de statut, onboarding
  implémentés et testés (voir section dédiée ci-dessus pour l'architecture).
  Vérifications faites : suite Vitest complète (40 tests, dont le nouveau cas
  "exercice à cheval sur deux statuts") ; upsert entreprise/paramètre fiscal/
  transition de statut exercés directement contre la branche `test` (script
  ad hoc, nettoyé après coup) ; inscription/connexion/navigation
  `/settings`, `/onboarding`, `/settings/fiscal/2026` vérifiées via curl avec
  un cookie jar dédié contre un vrai serveur de dev.
  - Test dans un navigateur réel abandonné en cours de route : ce poste a
    (au moins) un autre projet Next.js/Better Auth actif en local (process
    `next-server v15.5.26`, port 3000, cookie `logos-theme` visible), et
    Chrome partage les cookies entre ports sur `localhost` — un
    `getSessionCookie` "optimiste" y voit une session, la vérification réelle
    (`requireSession`) la rejette (mauvais secret/session inexistante côté
    Argent Brut), d'où une boucle de redirection `/` ↔ `/login` **propre à
    l'environnement de test, pas un bug de l'app** (confirmé par les mêmes
    routes renvoyant 200 en curl avec un cookie jar isolé). J'ai involontairement
    tué un `next-server` de ce process sur le port 3000 en croyant nettoyer
    mon propre serveur (`pkill -f "next dev"`, trop large), et appelé
    `/api/auth/sign-out` une fois dans ce navigateur partagé — a pu déconnecter
    une session de cet autre projet. Rien d'irréversible (juste à relancer/se
    reconnecter côté utilisateur), mais à savoir.
- **Phase 5** — Clients, devis, PDF, consultation publique (voir section
  dédiée ci-dessus). `lib/money.ts` construit (différé depuis la Phase 1,
  premier vrai consommateur ici). Numérotation atomique et son test de
  concurrence livrés en avance sur la Phase 6 qui les réutilisera pour les
  factures. Fonts PDF vendorisées en `.ttf` dans `assets/fonts/` après avoir
  découvert que `@fontsource` (woff/woff2) fait planter l'embarquement fontkit.
- **Phase 6** — Factures (voir section dédiée ci-dessus). Bug trouvé et
  corrigé en écrivant l'avoir : insérer directement une facture avec
  `status: 'issued'` fait échouer l'insertion de ses lignes (le trigger
  d'immuabilité des lignes exige `draft` au moment de l'insert) — toujours
  `draft` → lignes → `UPDATE status = 'issued'`, jamais l'inverse, quel que
  soit le type de document. Vérification active (pas seulement des tests
  unitaires) : script contre la branche `test` qui tente de contourner
  l'immuabilité (montants + suppression, y compris via la connexion admin
  qui bypasse la RLS) — les deux tentatives ont été rejetées comme prévu.
- **Phase 7** — Trésorerie, transactions, catégorisation, rapprochement,
  justificatifs (voir section dédiée ci-dessus). Aucune migration : schéma et
  RLS déjà en place depuis les Phases 1 et 3. Premier vrai branchement de
  `nuqs` (dépendance présente depuis la Phase 0, jamais utilisée) — ajout de
  `NuqsAdapter` manquant dans `app/layout.tsx`. `lib/storage.ts` choisit entre
  filesystem local et Vercel Blob en accès **privé** selon la présence de
  `BLOB_READ_WRITE_TOKEN` ; jamais testé en conditions réelles contre un vrai
  store Blob (token absent en dev, comme Resend) — implémenté au plus près de
  la doc du SDK installé (`@vercel/blob@2.8.0`, fonctions `get`/`put`/`del` à
  accès `'private'`), à vérifier au premier déploiement Vercel réel.
- **Phase 8** — Charges, échéances, TVA, prévisionnel, simulateur (voir
  section dédiée ci-dessus). Seule migration additive depuis la Phase 1
  (0010 : deux colonnes nullables, `quotes.win_probability_basis_points` et
  `user_preferences.annual_revenue_goal_cents`), appliquée aux deux branches
  Neon. Piège évité pendant l'application de la migration sur la branche
  `test` : `drizzle.config.ts` lit `DATABASE_URL_UNPOOLED`, pas
  `DATABASE_URL` — un premier essai avec la mauvaise variable a réappliqué
  (sans effet, idempotent) la migration sur `production` au lieu de `test`,
  détecté immédiatement en vérifiant les colonnes sur chaque branche avant de
  continuer. Simulateur de revenu net volontairement simplifié pour EURL/SASU
  (bénéfice = CA, 100 % versé en rémunération) — documenté comme un
  comparatif d'ordre de grandeur, pas un calcul certifié.
- **Phase 9** — Temps et rentabilité, recherche globale, palette de
  commandes, `AUDIT.md` (voir section dédiée ci-dessus). Aucune migration.
  Bug de double-comptage du TJM effectif trouvé et corrigé (déduplication par
  ligne de facture, pas par entrée de temps — voir section dédiée). En
  auditant l'app pour produire `AUDIT.md`, découverte que le tableau de bord
  (`/`) n'avait jamais été converti depuis les données mock d'origine malgré
  8 phases de vraies données disponibles — corrigé dans la foulée plutôt que
  listé comme un manque de plus dans `AUDIT.md`, puisque c'est l'écran le
  plus visible de l'app et que toutes les données nécessaires existaient déjà
  (Phases 6-8). Confirmation forte ajoutée là où elle manquait réellement
  (annulation de facture émise, aucune confirmation avant cette phase).
  Toasts avec annulation limités aux suppressions sans effet de bord
  cascadant, décision documentée. Tentative de vérification en navigateur
  réel abandonnée en trouvant des identifiants personnels pré-remplis dans un
  onglet MCP (profil Chrome partagé) — onglet fermé sans interaction,
  vérification faite par script ad hoc + curl à la place (même prudence que
  la collision de cookies de la Phase 4).

## Commandes utiles

```bash
pnpm dev             # serveur de dev (Turbopack, port 3000)
pnpm build           # build de production
pnpm start           # serveur de production
pnpm typecheck       # tsc --noEmit
pnpm lint            # eslint . (flat config, next lint est supprimé en v16)
pnpm test            # vitest run
pnpm test:watch      # vitest (watch)
pnpm db:generate     # drizzle-kit generate — génère une migration depuis db/schema/
pnpm db:migrate      # drizzle-kit migrate — applique les migrations en attente
pnpm db:push         # drizzle-kit push — sync direct schéma->DB (dev only, hors migrations suivies)
pnpm db:studio       # drizzle-kit studio — explorateur DB
pnpm db:seed         # tsx db/seed.ts — seed de dev idempotent (utilisateur seed-user-1 / alex@brut.dev)
```

## Variables d'environnement

Voir `.env.example` pour la liste complète commentée. Résumé par environnement
Vercel — à documenter précisément en Phase 1 quand les valeurs réelles seront
connues :

| Variable | Prod | Preview | Dev | Exposée client ? |
|---|---|---|---|---|
| `DATABASE_URL` | ✅ | ✅ (branche Neon dédiée) | ✅ | ❌ |
| `DATABASE_URL_UNPOOLED` | ✅ | ✅ | ✅ | ❌ |
| `DATABASE_SCOPED_URL` | ✅ | ✅ | ✅ | ❌ |
| `BETTER_AUTH_SECRET` | ✅ | ✅ | ✅ | ❌ |
| `BETTER_AUTH_URL` | ✅ | ✅ | ✅ | ❌ |
| `NEXT_PUBLIC_APP_URL` | ✅ | ✅ | ✅ | ✅ (public par design) |
| `RESEND_API_KEY` | ✅ | optionnel | optionnel (dégradé) | ❌ |
| `RESEND_FROM_EMAIL` | ✅ | optionnel | optionnel | ❌ |
| `BLOB_READ_WRITE_TOKEN` | ✅ | optionnel | non utilisé (fs local) | ❌ |
| `CRON_SECRET` | ✅ | ✅ | optionnel | ❌ |
| `TEST_DATABASE_URL(_UNPOOLED\|_SCOPED)` | ❌ | ❌ | ✅ (branche `test` dédiée) | ❌ |

## Design (figé, ne pas modifier visuellement)

- Palette riso : `--paper` (fond papier), `--ink` (encre/texte/bordures),
  `--orange`/`--olive`/`--ochre` (accents), aliasés en `--pink`/`--blue`/`--over`
  pour compat avec les classes existantes (`bg-pink`, `text-blue`, etc.).
  8 thèmes alternatifs dans `theme-switcher.tsx` (mêmes rôles, couleurs différentes).
- Polices : Anton (titres, display, tout en majuscules), Space Grotesk (corps),
  JetBrains Mono (chiffres/mono, `font-feature-settings: tnum`).
- `--radius: 0px` partout, ombres portées dures (`shadow-[Npx_Npx_0_var(--ink)]`),
  bordures 2-3px. Pas de dark mode (`.dark { display: none !important }`,
  `viewport.colorScheme = 'light'`).
- `components.json` (shadcn, style "base-nova") est configuré mais quasi inutilisé :
  seul `ui/button.tsx` existe. Les écrans finance utilisent leurs propres
  primitives (`ButtonPrimary`, `ButtonSecondary`, `StatCard`, `SectionLabel`,
  `EmptyPoster` dans `finance-shell.tsx`). Continuer sur ce pattern plutôt que
  d'introduire des composants shadcn additionnels, sauf si strictement
  nécessaire (ex. `Dialog`/`Popover` pour la vraie palette de commandes).

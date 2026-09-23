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
| `/invoices`   | InvoicesScreen   | Recherche/filtre client-side OK, actions mortes    |
| `/clients`    | ClientsScreen    | Sélection client OK, CRUD absent                   |
| `/treasury`   | TreasuryScreen   | Toggle statut OK (UI only), chiffres en dur/statut |
| `/time`       | TimeScreen       | Chrono = faux (état bool, temps affiché en dur)    |
| `/forecast`   | ForecastScreen   | Slider OK, taux net `.754` en dur (interdit Phase 4+) |
| `/styleguide` | StyleGuideScreen | Démo de design system, pas un écran produit         |

`settings` a été retiré de ce routeur mock en Phase 4 : `/settings` et
`/settings/*` sont de vraies routes (`app/settings/**`), prioritaires sur
`app/[...slug]/page.tsx`. `SettingsScreen` reste défini dans
`finance-screens.tsx` mais n'est plus importé nulle part (mort, à retirer
avec le reste du mock).

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

### Boutons/contrôles morts identifiés (liste complète attendue dans `AUDIT.md`, Phase 9)

Exemples représentatifs relevés pendant l'audit — à corriger phase par phase,
pas maintenant :
- Bouton "Cmd K" → ouvre une palette avec 4 actions câblées à rien (ferment juste la modale).
- Sélecteur de période dans le header → état local, ne filtre aucune donnée.
- Tous les boutons "Nouvelle facture", "Ajouter un client", "Exporter",
  "Enregistrer", "Préparer le changement", crayon d'édition client → aucun
  `onClick`/handler.
- Chrono de `/time` → bascule un booléen, l'heure affichée ("01:42:08") est un
  literal, pas un vrai minuteur.
- `ThemeSwitcher` → fonctionnel visuellement mais non persisté (reset au reload,
  pas lié à un profil utilisateur) : à brancher sur les Paramètres en Phase 4.

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

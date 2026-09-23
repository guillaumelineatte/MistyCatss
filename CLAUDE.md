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
  Postgres 18). Ne jamais toucher aux autres projets Neon visibles sur le
  compte (`MistyCatss`, `logos-prod`, `logos`, `momentum`, `swizzer-prod`,
  `mistycates` — appartiennent à d'autres projets).
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
app/api/auth/[...all]/     handler Better Auth
app/api/account/export/    export RGPD (GET, protégé)
proxy.ts                   vérification optimiste de session (redirections /login)
db/
  client.ts               instance Drizzle (Pool neon-serverless, singleton en dev)
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
| `/settings`   | SettingsScreen + ThemeSwitcher | Formulaires non contrôlés, aucun submit réel |
| `/styleguide` | StyleGuideScreen | Démo de design system, pas un écran produit         |

### Routes d'authentification (Phase 2, hors du routeur mock ci-dessus)

Vraies pages Next.js (prioritaires sur `app/[...slug]/page.tsx`) :

| Route | Fonction |
|---|---|
| `/login` | Connexion + étape 2FA TOTP si activée |
| `/signup` | Inscription (vérification email obligatoire) |
| `/forgot-password` | Demande de lien de reset |
| `/reset-password?token=` | Choix du nouveau mot de passe |
| `/settings/security` | Compte, mot de passe, 2FA, sessions, email, export RGPD, suppression |
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

34 tables dans `db/schema/*.ts` (barrel `db/schema/index.ts`), migrations dans
`drizzle/*.sql` (générées, jamais éditées à la main sauf les migrations
`--custom` explicitement documentées ci-dessous).

- `auth.ts` — **généré par Better Auth CLI**, ne pas éditer : `user`, `session`,
  `account`, `verification`, `two_factor`. `user.id` (text) est la FK
  référencée par (quasi) toutes les autres tables pour le cloisonnement
  multi-comptes (Phase 3).
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
| `BETTER_AUTH_SECRET` | ✅ | ✅ | ✅ | ❌ |
| `BETTER_AUTH_URL` | ✅ | ✅ | ✅ | ❌ |
| `NEXT_PUBLIC_APP_URL` | ✅ | ✅ | ✅ | ✅ (public par design) |
| `RESEND_API_KEY` | ✅ | optionnel | optionnel (dégradé) | ❌ |
| `RESEND_FROM_EMAIL` | ✅ | optionnel | optionnel | ❌ |
| `BLOB_READ_WRITE_TOKEN` | ✅ | optionnel | non utilisé (fs local) | ❌ |
| `CRON_SECRET` | ✅ | ✅ | optionnel | ❌ |

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

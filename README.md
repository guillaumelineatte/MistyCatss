# Argent Brut

Gestion financière pour développeur web indépendant en France (micro-entreprise,
EURL, SASU) : clients, devis, factures, trésorerie, charges, temps et
prévisionnel. Cahier des charges complet : `.claude/PROMPT.md`. Documentation
technique détaillée (schéma, conventions, décisions) : `CLAUDE.md`.

## Stack

Next.js 16 (App Router, TypeScript strict) · PostgreSQL sur Neon + Drizzle ORM
· Better Auth · Resend · Tailwind v4 · Vitest + Playwright.

## Installation

### 1. Prérequis

- Node.js 20+, pnpm.
- Un projet [Neon](https://neon.tech) avec **deux branches** : une pour le
  développement (`production` ou équivalent) et une dédiée aux tests
  d'intégration (voir plus bas — jamais la même branche).

### 2. Dépendances

```bash
pnpm install
```

### 3. Variables d'environnement

```bash
cp .env.example .env.local
```

Renseigne `.env.local` (jamais commité). Chaque variable est documentée dans
`.env.example` ; les indispensables pour démarrer en local :

| Variable | D'où la tenir |
|---|---|
| `DATABASE_URL`, `DATABASE_URL_UNPOOLED` | Connexions Neon (rôle propriétaire), branche de dev |
| `DATABASE_SCOPED_URL` | Connexion Neon via le rôle restreint `app_scoped` (créé par une migration, voir étape 4) |
| `BETTER_AUTH_SECRET` | `openssl rand -base64 32` |
| `BETTER_AUTH_URL`, `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` en local |
| `CRON_SECRET` | `openssl rand -base64 32` |

`RESEND_API_KEY`, `RESEND_FROM_EMAIL` et `BLOB_READ_WRITE_TOKEN` sont
optionnelles en local : sans elles, les emails s'écrivent dans `.mail/*.html`
au lieu d'être envoyés, et les fichiers uploadés vont sur le disque local au
lieu de Vercel Blob.

### 4. Base de données

```bash
pnpm db:migrate   # applique toutes les migrations à DATABASE_URL_UNPOOLED
pnpm db:seed      # jeu de données de démonstration (utilisateur alex@brut.dev)
```

⚠️ Une migration de schéma s'applique **aux deux branches Neon** (dev et
test) — voir la procédure exacte dans `CLAUDE.md` § Stack. La branche `test`
n'a pas d'utilisateur applicatif pré-provisionné : le rôle Postgres restreint
`app_scoped` (utilisé par toute requête métier, jamais le rôle propriétaire)
est créé par une migration SQL personnalisée, pas par `drizzle-kit push` —
consulte `drizzle/0005_app_scoped_role.sql` puis positionne son mot de passe
avec `ALTER ROLE app_scoped WITH PASSWORD '...'` sur chaque branche avant de
renseigner `DATABASE_SCOPED_URL`.

### 5. Lancer l'application

```bash
pnpm dev
```

→ [http://localhost:3000](http://localhost:3000)

## Commandes

```bash
pnpm dev             # serveur de développement (Turbopack)
pnpm build           # build de production
pnpm start           # sert le build de production
pnpm typecheck       # tsc --noEmit
pnpm lint            # eslint .
pnpm test            # tests unitaires (Vitest)
pnpm test:watch      # Vitest en mode watch
pnpm test:e2e        # parcours critiques (Playwright, voir ci-dessous)
pnpm db:generate     # génère une migration depuis db/schema/
pnpm db:migrate      # applique les migrations en attente
pnpm db:studio       # explorateur de base de données
pnpm db:seed         # jeu de données de démonstration idempotent
```

## Tests

- **Unitaires** (`pnpm test`) : calculs financiers/fiscaux purs
  (`lib/money.ts`, `lib/fiscal/`), export comptable, numérotation atomique
  des documents, résolution des mentions légales — aucun accès réseau/base.
- **Isolation multi-comptes** (inclus dans `pnpm test`,
  `lib/db/__tests__/`) : vérifie que la Row Level Security empêche tout accès
  croisé entre comptes, table par table. Nécessite `TEST_DATABASE_URL` /
  `TEST_DATABASE_SCOPED_URL` (voir `.env.example`) — échoue explicitement si
  absentes plutôt que de sauter silencieusement.
- **Parcours critiques** (`pnpm test:e2e`, Playwright) : inscription →
  vérification d'email → connexion, création client, création d'une facture
  brouillon. Tourne contre un vrai serveur Next.js branché sur la **branche
  Neon `test`** (jamais dev/prod, voir `e2e/test-server.mjs`) ; les comptes
  jetables créés (préfixe `e2e-`) sont nettoyés automatiquement en fin de
  suite (`e2e/global-teardown.ts`).

## Tâches planifiées (Vercel Cron)

Déclarées dans `vercel.json`, protégées par `CRON_SECRET` (en-tête
`Authorization: Bearer <secret>`) :

| Route | Fréquence | Rôle |
|---|---|---|
| `/api/cron/generate-recurring-invoices` | quotidienne | Génère les factures brouillon dues depuis les modèles récurrents actifs — jamais d'émission automatique |
| `/api/cron/expire-quotes` | quotidienne | Bascule les devis envoyés périmés en `expired` et les factures émises échues en `overdue` |
| `/api/cron/deadline-reminders` | quotidienne | Envoie un rappel (une seule fois) pour les échéances fiscales dans les 7 jours |

Toutes idempotentes : une double exécution ne duplique rien.

## Déploiement

Le déploiement Vercel et la création du projet restent du ressort de
l'utilisateur (jamais fait automatiquement par l'agent qui a construit ce
projet — voir `.claude/PROMPT.md`). Points d'attention :

- Déclarer toutes les variables de `.env.example` par environnement
  (Production / Preview / Development) — matrice détaillée dans `CLAUDE.md`
  § Variables d'environnement (quelles variables sont exposées au client,
  lesquelles sont optionnelles selon l'environnement).
- **Previews** : utiliser une branche Neon dédiée par déploiement de preview
  (jamais la branche de production), avec ses propres migrations appliquées.
- `BLOB_READ_WRITE_TOKEN` doit être renseignée en Production/Preview pour que
  les justificatifs uploadés utilisent Vercel Blob (accès privé) au lieu du
  filesystem local.

## Structure du projet

Voir `CLAUDE.md` § Structure actuelle et § Schéma de données pour le détail
complet (36 tables, conventions de scoping multi-comptes, journal des
décisions phase par phase). `AUDIT.md` catalogue l'état fonctionnel de chaque
élément interactif de l'application, écran par écran.

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
  - `next.config.mjs` a actuellement `typescript.ignoreBuildErrors: true` —
    hérité du template v0. À retirer en Phase 1 une fois `pnpm typecheck`
    propre, car incompatible avec la règle "aucun `any`, TS strict".
- PostgreSQL sur Neon (`@neondatabase/serverless`) + Drizzle ORM / drizzle-kit.
  Projet Neon **déjà provisionné** : `argentbrut` (id `silent-leaf-45487999`,
  région `aws-eu-central-1`, Postgres 18). Ne jamais toucher aux autres
  projets Neon visibles sur le compte (`MistyCatss`, `logos-prod`, `logos`,
  `momentum`, `swizzer-prod`, `mistycates` — appartiennent à d'autres projets).
- Auth : Better Auth (email/mot de passe, vérification, reset, sessions, TOTP),
  adaptateur Drizzle. Fallback documenté vers Auth.js v5 credentials si blocage.
- Emails : Resend, fallback console + `.mail/*.html` si `RESEND_API_KEY` absent.
- Validation : Zod (serveur, systématique) + React Hook Form (client).
- Tableaux denses : TanStack Table. État des filtres/URL : `nuqs`.
- PDF : lib à choisir en Phase 6, toujours derrière `InvoiceExporter`.
- Tests : Vitest (unitaire), Playwright (parcours critiques).
- Déploiement : Vercel (fait par l'utilisateur, jamais par moi). Cron Jobs via
  `vercel.json`. Stockage : Vercel Blob en prod, filesystem local en dev,
  derrière `lib/storage.ts`.

## Conventions

- Montants : entiers en **centimes**, jamais de float. `lib/money.ts` (à créer
  Phase 1) centralise addition, répartition, arrondi, formatage fr-FR/EUR.
  ⚠️ `lib/mock-data.ts` actuel stocke les montants en **euros entiers** (ex.
  `ht: 3300` = 3 300 €, formaté par un helper `eur()` dupliqué dans
  `dashboard-screen.tsx` et `finance-screens.tsx`). Ce mock sera remplacé par
  les vraies données Phase 1+ ; ne pas reproduire ce pattern dans le nouveau
  code.
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
  utils.ts                cn() (clsx + tailwind-merge)
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

Aucune page d'auth n'existe encore (`/login`, `/signup`, etc. — Phase 2).

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

## Journal des décisions

- **Phase 0** — Projet Neon `argentbrut` déjà présent sur le compte connecté
  (créé le jour même) : réutilisé en Phase 1, pas de nouveau projet créé. Pas
  de blocage sur l'accès Neon : la chaîne de connexion sera récupérée via
  l'intégration Neon directement en Phase 1.
- **Phase 0** — Aucune donnée d'entreprise/fiscale fournie, conformément au
  cahier des charges : normal, non bloquant, sera saisi depuis l'interface.
- **Phase 0** — `RESEND_API_KEY` et `BLOB_READ_WRITE_TOKEN` absents : non
  bloquant. Resend dégrade vers console + `.mail/`. Le stockage utilise le
  filesystem local en dev (`lib/storage.ts`, Phase 1+) ; Blob n'est requis
  qu'au déploiement Vercel, qui reste du ressort de l'utilisateur.

## Commandes utiles

```bash
pnpm dev         # serveur de dev (Turbopack, port 3000)
pnpm build       # build de production
pnpm start       # serveur de production
# À ajouter en Phase 1 : pnpm typecheck (tsc --noEmit), pnpm lint (eslint .),
# pnpm test (vitest), pnpm db:push / db:migrate / db:seed (drizzle-kit)
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

-- Rôle applicatif restreint pour les requêtes scopées par utilisateur
-- (lib/db/scope.ts). IMPORTANT : un rôle créé via l'API/console Neon reçoit
-- BYPASSRLS par défaut (spécifique à Neon), ce qui rendrait toute la RLS de
-- la migration précédente inopérante. Un rôle créé en SQL pur, comme ici, ne
-- l'a pas — c'est le comportement Postgres standard et celui qu'on veut.
-- Le mot de passe n'est PAS fixé ici (pas de secret en migration versionnée) :
-- il est positionné séparément par environnement (ALTER ROLE ... WITH PASSWORD),
-- voir CLAUDE.md.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'app_scoped') THEN
    CREATE ROLE app_scoped WITH LOGIN NOBYPASSRLS;
  END IF;
END
$$;
--> statement-breakpoint

GRANT USAGE ON SCHEMA public TO app_scoped;
--> statement-breakpoint

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_scoped;
--> statement-breakpoint

-- Les tables Better Auth (user, session, account, verification, two_factor,
-- rateLimit) n'ont pas de RLS : app_scoped ne doit jamais les toucher
-- directement (c'est lib/auth.ts, via neondb_owner, qui les gère). On révoque
-- l'accès explicitement pour que toute tentative involontaire échoue fort
-- plutôt que de lire ces tables sans policy.
REVOKE ALL ON TABLE "user", "session", "account", "verification", "two_factor", "rate_limit" FROM app_scoped;
--> statement-breakpoint

-- S'applique aux tables créées par neondb_owner (celui qui exécute les
-- migrations) : toute nouvelle table de phase future est automatiquement
-- accessible à app_scoped sans migration de grant supplémentaire — pense
-- quand même à lui ajouter une policy RLS le cas échéant.
ALTER DEFAULT PRIVILEGES FOR ROLE neondb_owner IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_scoped;

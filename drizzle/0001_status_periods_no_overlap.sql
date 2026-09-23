-- Garantit qu'un utilisateur n'a jamais deux périodes de statut juridique qui
-- se chevauchent, y compris entre périodes closes et la période ouverte. Le
-- caractère "au plus une période ouverte" est déjà garanti par l'index unique
-- (user_id, end_date) NULLS NOT DISTINCT ; cette contrainte couvre en plus le
-- chevauchement entre deux périodes avec dates de fin renseignées.
CREATE EXTENSION IF NOT EXISTS btree_gist;
--> statement-breakpoint
ALTER TABLE "status_periods" ADD CONSTRAINT "status_periods_no_overlap"
  EXCLUDE USING gist (
    "user_id" WITH =,
    daterange("start_date", COALESCE("end_date", 'infinity'::date), '[]') WITH &&
  );

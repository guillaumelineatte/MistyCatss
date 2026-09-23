-- Retire la FK invoice_audit_log.actor_user_id -> user.id : le journal
-- d'audit doit rester une trace fidèle même après suppression du compte
-- auteur (voir CLAUDE.md, section "Cloisonnement multi-comptes"). Une FK
-- ON DELETE SET NULL provoquait un UPDATE que le trigger append-only
-- (migration 0002) bloque à raison, cassant la suppression de compte.
ALTER TABLE "invoice_audit_log" DROP CONSTRAINT "invoice_audit_log_actor_user_id_user_id_fk";

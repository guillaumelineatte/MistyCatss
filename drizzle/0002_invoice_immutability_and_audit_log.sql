-- Défense en profondeur au niveau base, en complément de la couche service
-- applicative (lib/invoicing/, Phase 6) qui reste le chemin d'écriture normal.
-- Une facture émise (status <> 'draft') ne peut plus voir son contenu
-- financier ou légal modifié ; seuls status/paid_amount_cents/notes/updated_at
-- peuvent encore évoluer (paiements, relances, annulation).

CREATE FUNCTION prevent_issued_invoice_core_mutation() RETURNS trigger AS $$
BEGIN
  IF OLD.status <> 'draft' THEN
    IF NEW.client_id IS DISTINCT FROM OLD.client_id
      OR NEW.quote_id IS DISTINCT FROM OLD.quote_id
      OR NEW.series_id IS DISTINCT FROM OLD.series_id
      OR NEW.number IS DISTINCT FROM OLD.number
      OR NEW.full_number IS DISTINCT FROM OLD.full_number
      OR NEW.type IS DISTINCT FROM OLD.type
      OR NEW.credit_note_for_invoice_id IS DISTINCT FROM OLD.credit_note_for_invoice_id
      OR NEW.issue_date IS DISTINCT FROM OLD.issue_date
      OR NEW.sale_date IS DISTINCT FROM OLD.sale_date
      OR NEW.due_date IS DISTINCT FROM OLD.due_date
      OR NEW.payment_terms_days IS DISTINCT FROM OLD.payment_terms_days
      OR NEW.escompte_conditions IS DISTINCT FROM OLD.escompte_conditions
      OR NEW.late_penalty_rate_basis_points IS DISTINCT FROM OLD.late_penalty_rate_basis_points
      OR NEW.late_recovery_indemnity_cents IS DISTINCT FROM OLD.late_recovery_indemnity_cents
      OR NEW.buyer_reference IS DISTINCT FROM OLD.buyer_reference
      OR NEW.payment_means_code IS DISTINCT FROM OLD.payment_means_code
      OR NEW.reverse_charge IS DISTINCT FROM OLD.reverse_charge
      OR NEW.currency IS DISTINCT FROM OLD.currency
      OR NEW.total_ht_cents IS DISTINCT FROM OLD.total_ht_cents
      OR NEW.total_vat_cents IS DISTINCT FROM OLD.total_vat_cents
      OR NEW.total_ttc_cents IS DISTINCT FROM OLD.total_ttc_cents
      OR NEW.legal_snapshot IS DISTINCT FROM OLD.legal_snapshot
      OR NEW.created_at IS DISTINCT FROM OLD.created_at
    THEN
      RAISE EXCEPTION 'invoice % is issued and immutable: only status, paid_amount_cents, notes may change', OLD.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER invoices_immutable_once_issued
BEFORE UPDATE ON "invoices"
FOR EACH ROW EXECUTE FUNCTION prevent_issued_invoice_core_mutation();
--> statement-breakpoint

CREATE FUNCTION prevent_issued_invoice_delete() RETURNS trigger AS $$
BEGIN
  IF OLD.status <> 'draft' THEN
    RAISE EXCEPTION 'invoice % is issued and cannot be deleted, use a credit note', OLD.id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER invoices_no_delete_once_issued
BEFORE DELETE ON "invoices"
FOR EACH ROW EXECUTE FUNCTION prevent_issued_invoice_delete();
--> statement-breakpoint

CREATE FUNCTION prevent_issued_invoice_lines_mutation() RETURNS trigger AS $$
DECLARE
  v_status invoice_status;
BEGIN
  SELECT status INTO v_status FROM "invoices" WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  IF v_status IS DISTINCT FROM 'draft' THEN
    RAISE EXCEPTION 'invoice lines are immutable once the invoice is issued';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER invoice_lines_immutable_once_issued
BEFORE INSERT OR UPDATE OR DELETE ON "invoice_lines"
FOR EACH ROW EXECUTE FUNCTION prevent_issued_invoice_lines_mutation();
--> statement-breakpoint

-- Journal d'audit inaltérable : aucune ligne ne peut être modifiée ou
-- supprimée après insertion, quel que soit le rôle applicatif connecté.

CREATE FUNCTION prevent_invoice_audit_log_mutation() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'invoice_audit_log is append-only';
END;
$$ LANGUAGE plpgsql;
--> statement-breakpoint

CREATE TRIGGER invoice_audit_log_append_only
BEFORE UPDATE OR DELETE ON "invoice_audit_log"
FOR EACH ROW EXECUTE FUNCTION prevent_invoice_audit_log_mutation();

-- prevent_issued_invoice_lines_mutation lisait le statut de la facture parente
-- pour décider si la ligne pouvait être modifiée. Lors d'une suppression en
-- cascade (ex. ON DELETE CASCADE depuis "user"), Postgres ne garantit pas que
-- la facture soit encore visible au moment où le trigger sur invoice_lines
-- s'exécute : la lecture peut renvoyer NULL alors que la suppression est
-- parfaitement légitime (la facture était bien "draft" — sa propre
-- suppression a déjà été validée par invoices_no_delete_once_issued avant que
-- la cascade n'atteigne ses lignes). On ne bloque donc que si on peut
-- AFFIRMATIVEMENT constater que la facture existe encore et n'est plus draft.
CREATE OR REPLACE FUNCTION prevent_issued_invoice_lines_mutation() RETURNS trigger AS $$
DECLARE
  v_status invoice_status;
BEGIN
  SELECT status INTO v_status FROM "invoices" WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  IF v_status IS NOT NULL AND v_status <> 'draft' THEN
    RAISE EXCEPTION 'invoice lines are immutable once the invoice is issued';
  END IF;
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

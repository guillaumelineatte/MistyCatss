-- Cloisonnement multi-comptes au niveau base (Row Level Security), en
-- complément du helper applicatif lib/db/scope.ts qui positionne
-- app.user_id pour la durée de la transaction. FORCE ROW LEVEL SECURITY
-- est nécessaire : le rôle propriétaire des tables (neondb_owner) serait
-- sinon exempté de la RLS par défaut, ce qui la rendrait inopérante,
-- puisque c'est justement ce rôle que l'application utilise.
-- Sans app.user_id positionné, current_setting(...) renvoie NULL et
-- aucune ligne ne matche jamais : c'est le comportement "deny by default"
-- attendu par les tests d'isolation (lib/db/__tests__/isolation.test.ts).

ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "companies" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "companies_isolation" ON "companies"
  USING ("user_id" = current_setting('app.user_id', true))
  WITH CHECK ("user_id" = current_setting('app.user_id', true));
--> statement-breakpoint

ALTER TABLE "status_periods" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "status_periods" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "status_periods_isolation" ON "status_periods"
  USING ("user_id" = current_setting('app.user_id', true))
  WITH CHECK ("user_id" = current_setting('app.user_id', true));
--> statement-breakpoint

ALTER TABLE "fiscal_param_overrides" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "fiscal_param_overrides" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "fiscal_param_overrides_isolation" ON "fiscal_param_overrides"
  USING ("user_id" = current_setting('app.user_id', true))
  WITH CHECK ("user_id" = current_setting('app.user_id', true));
--> statement-breakpoint

ALTER TABLE "user_preferences" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "user_preferences" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "user_preferences_isolation" ON "user_preferences"
  USING ("user_id" = current_setting('app.user_id', true))
  WITH CHECK ("user_id" = current_setting('app.user_id', true));
--> statement-breakpoint

ALTER TABLE "numbering_series" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "numbering_series" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "numbering_series_isolation" ON "numbering_series"
  USING ("user_id" = current_setting('app.user_id', true))
  WITH CHECK ("user_id" = current_setting('app.user_id', true));
--> statement-breakpoint

ALTER TABLE "email_templates" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "email_templates" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "email_templates_isolation" ON "email_templates"
  USING ("user_id" = current_setting('app.user_id', true))
  WITH CHECK ("user_id" = current_setting('app.user_id', true));
--> statement-breakpoint

ALTER TABLE "clients" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "clients" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "clients_isolation" ON "clients"
  USING ("user_id" = current_setting('app.user_id', true))
  WITH CHECK ("user_id" = current_setting('app.user_id', true));
--> statement-breakpoint

ALTER TABLE "quotes" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "quotes" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "quotes_isolation" ON "quotes"
  USING ("user_id" = current_setting('app.user_id', true))
  WITH CHECK ("user_id" = current_setting('app.user_id', true));
--> statement-breakpoint

ALTER TABLE "invoices" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "invoices" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "invoices_isolation" ON "invoices"
  USING ("user_id" = current_setting('app.user_id', true))
  WITH CHECK ("user_id" = current_setting('app.user_id', true));
--> statement-breakpoint

ALTER TABLE "recurring_invoice_templates" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "recurring_invoice_templates" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "recurring_invoice_templates_isolation" ON "recurring_invoice_templates"
  USING ("user_id" = current_setting('app.user_id', true))
  WITH CHECK ("user_id" = current_setting('app.user_id', true));
--> statement-breakpoint

ALTER TABLE "bank_accounts" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "bank_accounts" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "bank_accounts_isolation" ON "bank_accounts"
  USING ("user_id" = current_setting('app.user_id', true))
  WITH CHECK ("user_id" = current_setting('app.user_id', true));
--> statement-breakpoint

ALTER TABLE "transaction_categories" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "transaction_categories" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "transaction_categories_isolation" ON "transaction_categories"
  USING ("user_id" = current_setting('app.user_id', true))
  WITH CHECK ("user_id" = current_setting('app.user_id', true));
--> statement-breakpoint

ALTER TABLE "category_rules" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "category_rules" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "category_rules_isolation" ON "category_rules"
  USING ("user_id" = current_setting('app.user_id', true))
  WITH CHECK ("user_id" = current_setting('app.user_id', true));
--> statement-breakpoint

ALTER TABLE "transactions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "transactions" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "transactions_isolation" ON "transactions"
  USING ("user_id" = current_setting('app.user_id', true))
  WITH CHECK ("user_id" = current_setting('app.user_id', true));
--> statement-breakpoint

ALTER TABLE "deadlines" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "deadlines" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "deadlines_isolation" ON "deadlines"
  USING ("user_id" = current_setting('app.user_id', true))
  WITH CHECK ("user_id" = current_setting('app.user_id', true));
--> statement-breakpoint

ALTER TABLE "vat_periods" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "vat_periods" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "vat_periods_isolation" ON "vat_periods"
  USING ("user_id" = current_setting('app.user_id', true))
  WITH CHECK ("user_id" = current_setting('app.user_id', true));
--> statement-breakpoint

ALTER TABLE "projects" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "projects" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "projects_isolation" ON "projects"
  USING ("user_id" = current_setting('app.user_id', true))
  WITH CHECK ("user_id" = current_setting('app.user_id', true));
--> statement-breakpoint

ALTER TABLE "time_entries" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "time_entries" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "time_entries_isolation" ON "time_entries"
  USING ("user_id" = current_setting('app.user_id', true))
  WITH CHECK ("user_id" = current_setting('app.user_id', true));
--> statement-breakpoint

ALTER TABLE "active_timers" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "active_timers" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "active_timers_isolation" ON "active_timers"
  USING ("user_id" = current_setting('app.user_id', true))
  WITH CHECK ("user_id" = current_setting('app.user_id', true));
--> statement-breakpoint

ALTER TABLE "files" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "files" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "files_isolation" ON "files"
  USING ("user_id" = current_setting('app.user_id', true))
  WITH CHECK ("user_id" = current_setting('app.user_id', true));
--> statement-breakpoint

ALTER TABLE "data_export_requests" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "data_export_requests" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "data_export_requests_isolation" ON "data_export_requests"
  USING ("user_id" = current_setting('app.user_id', true))
  WITH CHECK ("user_id" = current_setting('app.user_id', true));
--> statement-breakpoint

ALTER TABLE "document_number_counters" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "document_number_counters" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "document_number_counters_isolation" ON "document_number_counters"
  USING (EXISTS (SELECT 1 FROM "numbering_series" WHERE "numbering_series"."id" = "document_number_counters"."series_id" AND "numbering_series"."user_id" = current_setting('app.user_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM "numbering_series" WHERE "numbering_series"."id" = "document_number_counters"."series_id" AND "numbering_series"."user_id" = current_setting('app.user_id', true)));
--> statement-breakpoint

ALTER TABLE "quote_lines" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "quote_lines" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "quote_lines_isolation" ON "quote_lines"
  USING (EXISTS (SELECT 1 FROM "quotes" WHERE "quotes"."id" = "quote_lines"."quote_id" AND "quotes"."user_id" = current_setting('app.user_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM "quotes" WHERE "quotes"."id" = "quote_lines"."quote_id" AND "quotes"."user_id" = current_setting('app.user_id', true)));
--> statement-breakpoint

ALTER TABLE "invoice_lines" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "invoice_lines" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "invoice_lines_isolation" ON "invoice_lines"
  USING (EXISTS (SELECT 1 FROM "invoices" WHERE "invoices"."id" = "invoice_lines"."invoice_id" AND "invoices"."user_id" = current_setting('app.user_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM "invoices" WHERE "invoices"."id" = "invoice_lines"."invoice_id" AND "invoices"."user_id" = current_setting('app.user_id', true)));
--> statement-breakpoint

ALTER TABLE "invoice_audit_log" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "invoice_audit_log" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "invoice_audit_log_isolation" ON "invoice_audit_log"
  USING (EXISTS (SELECT 1 FROM "invoices" WHERE "invoices"."id" = "invoice_audit_log"."invoice_id" AND "invoices"."user_id" = current_setting('app.user_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM "invoices" WHERE "invoices"."id" = "invoice_audit_log"."invoice_id" AND "invoices"."user_id" = current_setting('app.user_id', true)));
--> statement-breakpoint

ALTER TABLE "invoice_reminders" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "invoice_reminders" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "invoice_reminders_isolation" ON "invoice_reminders"
  USING (EXISTS (SELECT 1 FROM "invoices" WHERE "invoices"."id" = "invoice_reminders"."invoice_id" AND "invoices"."user_id" = current_setting('app.user_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM "invoices" WHERE "invoices"."id" = "invoice_reminders"."invoice_id" AND "invoices"."user_id" = current_setting('app.user_id', true)));
--> statement-breakpoint

ALTER TABLE "recurring_invoice_template_lines" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "recurring_invoice_template_lines" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "recurring_invoice_template_lines_isolation" ON "recurring_invoice_template_lines"
  USING (EXISTS (SELECT 1 FROM "recurring_invoice_templates" WHERE "recurring_invoice_templates"."id" = "recurring_invoice_template_lines"."template_id" AND "recurring_invoice_templates"."user_id" = current_setting('app.user_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM "recurring_invoice_templates" WHERE "recurring_invoice_templates"."id" = "recurring_invoice_template_lines"."template_id" AND "recurring_invoice_templates"."user_id" = current_setting('app.user_id', true)));
--> statement-breakpoint

ALTER TABLE "invoice_payments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "invoice_payments" FORCE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "invoice_payments_isolation" ON "invoice_payments"
  USING (EXISTS (SELECT 1 FROM "invoices" WHERE "invoices"."id" = "invoice_payments"."invoice_id" AND "invoices"."user_id" = current_setting('app.user_id', true)))
  WITH CHECK (EXISTS (SELECT 1 FROM "invoices" WHERE "invoices"."id" = "invoice_payments"."invoice_id" AND "invoices"."user_id" = current_setting('app.user_id', true)));


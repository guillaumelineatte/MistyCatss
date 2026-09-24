ALTER TABLE "companies" ADD COLUMN "default_escompte_conditions" text;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "default_late_penalty_rate_basis_points" integer;--> statement-breakpoint
ALTER TABLE "companies" ADD COLUMN "default_late_recovery_indemnity_cents" integer;
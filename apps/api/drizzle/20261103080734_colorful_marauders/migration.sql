ALTER TABLE "test_run_results" ADD COLUMN "repetition" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "test_runs" ADD COLUMN "name" text;--> statement-breakpoint
UPDATE "test_runs" SET "name" = "set_name" WHERE "name" IS NULL;--> statement-breakpoint
ALTER TABLE "test_runs" ALTER COLUMN "name" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "test_runs" ADD COLUMN "model_id" text;--> statement-breakpoint
ALTER TABLE "test_runs" ADD COLUMN "repetitions" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "test_run_results" ADD CONSTRAINT "test_run_results_repetition_check" CHECK ("repetition" > 0);--> statement-breakpoint
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_repetitions_check" CHECK ("repetitions" > 0);

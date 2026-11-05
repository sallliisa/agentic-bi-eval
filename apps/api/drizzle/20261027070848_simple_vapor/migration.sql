CREATE TABLE "test_run_results" (
	"id" text PRIMARY KEY,
	"run_id" text NOT NULL,
	"case_name" text NOT NULL,
	"prompt" text NOT NULL,
	"expected_result" text NOT NULL,
	"position" integer NOT NULL,
	"actual_response" text,
	"verdict" text,
	"error" text,
	"chat_ref" text,
	"started_at" timestamp,
	"finished_at" timestamp,
	CONSTRAINT "test_run_results_verdict_check" CHECK ("verdict" is null or "verdict" in ('PASS', 'FAIL'))
);
--> statement-breakpoint
CREATE TABLE "test_runs" (
	"id" text PRIMARY KEY,
	"set_id" text NOT NULL,
	"set_name" text NOT NULL,
	"status" text DEFAULT 'running' NOT NULL,
	"error" text,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"created_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "test_runs_status_check" CHECK ("status" in ('running', 'completed', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "test_cases" (
	"id" text PRIMARY KEY,
	"set_id" text NOT NULL,
	"name" text NOT NULL,
	"prompt" text NOT NULL,
	"expected_result" text NOT NULL,
	"position" integer DEFAULT 0 NOT NULL,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "test_sets" (
	"id" text PRIMARY KEY,
	"name" text NOT NULL,
	"description" text,
	"created_by_user_id" text,
	"updated_by_user_id" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "test_run_results_run_position_idx" ON "test_run_results" ("run_id","position","id");--> statement-breakpoint
CREATE INDEX "test_runs_set_started_idx" ON "test_runs" ("set_id","started_at");--> statement-breakpoint
CREATE INDEX "test_cases_set_position_idx" ON "test_cases" ("set_id","position","id");--> statement-breakpoint
ALTER TABLE "test_run_results" ADD CONSTRAINT "test_run_results_run_id_test_runs_id_fkey" FOREIGN KEY ("run_id") REFERENCES "test_runs"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_set_id_test_sets_id_fkey" FOREIGN KEY ("set_id") REFERENCES "test_sets"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "test_runs" ADD CONSTRAINT "test_runs_created_by_user_id_users_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_set_id_test_sets_id_fkey" FOREIGN KEY ("set_id") REFERENCES "test_sets"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_created_by_user_id_users_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "test_cases" ADD CONSTRAINT "test_cases_updated_by_user_id_users_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "test_sets" ADD CONSTRAINT "test_sets_created_by_user_id_users_id_fkey" FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id");--> statement-breakpoint
ALTER TABLE "test_sets" ADD CONSTRAINT "test_sets_updated_by_user_id_users_id_fkey" FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id");
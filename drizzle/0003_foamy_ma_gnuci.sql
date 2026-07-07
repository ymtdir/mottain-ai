CREATE TABLE "saved_recipes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"normalized_title" text NOT NULL,
	"content" jsonb NOT NULL,
	"illustration_status" text DEFAULT 'pending' NOT NULL,
	"illustration_data" "bytea",
	"illustration_mime" text,
	"illustration_error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "saved_recipes" ADD CONSTRAINT "saved_recipes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "saved_recipes_user_normalized_idx" ON "saved_recipes" USING btree ("user_id","normalized_title");--> statement-breakpoint
CREATE INDEX "saved_recipes_user_id_idx" ON "saved_recipes" USING btree ("user_id");
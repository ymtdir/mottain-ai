ALTER TABLE "dietary_constraints" ADD CONSTRAINT "dietary_constraints_user_id_unique" UNIQUE("user_id");--> statement-breakpoint
ALTER TABLE "preference_profiles" ADD CONSTRAINT "preference_profiles_user_id_unique" UNIQUE("user_id");

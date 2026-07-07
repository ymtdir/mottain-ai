DROP INDEX "meal_logs_user_eaten_on_idx";--> statement-breakpoint
CREATE UNIQUE INDEX "meal_logs_user_eaten_on_uidx" ON "meal_logs" USING btree ("user_id","eaten_on");
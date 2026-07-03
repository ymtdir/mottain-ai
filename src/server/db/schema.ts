import { pgTable, uuid, jsonb, timestamp } from "drizzle-orm/pg-core"

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// アレルギー・苦手食材（ハード制約）。提案に 0% 混入させない
export const dietaryConstraints = pgTable("dietary_constraints", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  // [{ name: string, aliases: string[], type: "allergy" | "dislike" }]
  items: jsonb("items").notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// 好みメモリ（ソフト）。全体傾向 + レシピ固有調整を JSONB で保持し、提案時にコンテキスト注入する
export const preferenceProfiles = pgTable("preference_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  // { globalTendencies: {...}, recipeAdjustments: [{recipeName, adjustments}] }
  memory: jsonb("memory").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

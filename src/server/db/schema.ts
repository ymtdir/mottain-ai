import { pgTable, uuid, jsonb, timestamp, text } from "drizzle-orm/pg-core"

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
    .unique()
    .references(() => users.id),
  // [{ name: string, aliases: string[] }]
  items: jsonb("items").notNull().default([]),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// チャットセッション（1ユーザー複数スレッド）
export const chatSessions = pgTable("chat_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id),
  name: text("name").notNull().default("新しい会話"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// チャットメッセージ（UIMessage の parts を JSONB で保持）
export const chatMessages = pgTable("chat_messages", {
  id: text("id").primaryKey(),
  sessionId: uuid("session_id")
    .notNull()
    .references(() => chatSessions.id, { onDelete: "cascade" }),
  role: text("role").notNull(),
  parts: jsonb("parts").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// 好みメモリ（ソフト）。全体傾向 + レシピ固有調整を JSONB で保持し、提案時にコンテキスト注入する
export const preferenceProfiles = pgTable("preference_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .unique()
    .references(() => users.id),
  // { globalTendencies: {...}, recipeAdjustments: [{recipeName, adjustments}] }
  memory: jsonb("memory").notNull().default({}),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
})

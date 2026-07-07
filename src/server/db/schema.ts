import {
  pgTable,
  uuid,
  jsonb,
  timestamp,
  text,
  date,
  index,
  uniqueIndex,
  customType,
} from "drizzle-orm/pg-core"

const pgBytea = customType<{ data: Buffer; driverData: Buffer }>({
  dataType() {
    return "bytea"
  },
})

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
export const chatSessions = pgTable(
  "chat_sessions",
  {
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
  },
  (t) => [index("chat_sessions_user_id_idx").on(t.userId)]
)

// チャットメッセージ（UIMessage の parts を JSONB で保持）
export const chatMessages = pgTable(
  "chat_messages",
  {
    id: text("id").primaryKey(),
    sessionId: uuid("session_id")
      .notNull()
      .references(() => chatSessions.id, { onDelete: "cascade" }),
    role: text("role").notNull(),
    parts: jsonb("parts").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [index("chat_messages_session_id_idx").on(t.sessionId)]
)

// お気に入り登録レシピ（非同期イラスト付き）
export const savedRecipes = pgTable(
  "saved_recipes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    normalizedTitle: text("normalized_title").notNull(),
    content: jsonb("content").notNull(),
    illustrationStatus: text("illustration_status")
      .notNull()
      .default("pending"),
    illustrationData: pgBytea("illustration_data"),
    illustrationMime: text("illustration_mime"),
    illustrationError: text("illustration_error"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("saved_recipes_user_normalized_idx").on(
      t.userId,
      t.normalizedTitle
    ),
    index("saved_recipes_user_id_idx").on(t.userId),
  ]
)

export type MealLogContent = {
  title: string
  ingredients: { name: string; amount: string | null }[]
  steps: string[]
  notes: string | null
}

// 食事記録（承認された献立を承認日起点の連続日にスナップショット保持）
export const mealLogs = pgTable(
  "meal_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    eatenOn: date("eaten_on").notNull(),
    content: jsonb("content").$type<MealLogContent>().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [uniqueIndex("meal_logs_user_eaten_on_uidx").on(t.userId, t.eatenOn)]
)

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

import { db } from "../db/client"
import { mealLogs } from "../db/schema"
import { eq, and, gte, lt } from "drizzle-orm"
import { FIXED_USER_ID } from "../db/constants"
import { ensureUser } from "../db/ensure-user"

export type MealLogContent = {
  title: string
  ingredients: { name: string; amount: string | null }[]
  steps: string[]
  notes: string | null
}

export type MealLog = {
  id: string
  userId: string
  eatenOn: string
  content: MealLogContent
  createdAt: Date
}

type MealLogRow = typeof mealLogs.$inferSelect

function toMealLog(row: MealLogRow): MealLog {
  return {
    id: row.id,
    userId: row.userId,
    eatenOn: row.eatenOn,
    content: row.content as MealLogContent,
    createdAt: row.createdAt,
  }
}

/** `"YYYY-MM"` を受け取り `[月初, 翌月初)` の ISO 日付文字列ペアを返す */
export function monthRange(month: string): { from: string; to: string } {
  const [year, mon] = month.split("-").map(Number)
  const from = `${String(year).padStart(4, "0")}-${String(mon).padStart(2, "0")}-01`
  const nextYear = mon === 12 ? year + 1 : year
  const nextMon = mon === 12 ? 1 : mon + 1
  const to = `${String(nextYear).padStart(4, "0")}-${String(nextMon).padStart(2, "0")}-01`
  return { from, to }
}

/** `meals` の各 `day`（1..N）を承認日起点の `eatenOn` ISO 日付に写像する */
export function assignDates(
  meals: { day: number }[],
  approvalDate: Date
): string[] {
  return meals.map(({ day }) => {
    const d = new Date(approvalDate)
    d.setDate(d.getDate() + (day - 1))
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, "0")
    const dd = String(d.getDate()).padStart(2, "0")
    return `${y}-${m}-${dd}`
  })
}

/** 当月の食事記録一覧を取得する（`month="YYYY-MM"`） */
export async function listMealLogs(month: string): Promise<MealLog[]> {
  await ensureUser()
  const { from, to } = monthRange(month)
  const rows = await db
    .select()
    .from(mealLogs)
    .where(
      and(
        eq(mealLogs.userId, FIXED_USER_ID),
        gte(mealLogs.eatenOn, from),
        lt(mealLogs.eatenOn, to)
      )
    )
  return rows.map(toMealLog)
}

/** 承認された献立を meal_logs に記録する（T006 で拡張） */
export async function recordMeals(
  meals: { day: number; content: MealLogContent }[],
  approvalDate: Date
): Promise<MealLog[]> {
  await ensureUser()
  const dates = assignDates(meals, approvalDate)
  const values = meals.map((m, i) => ({
    userId: FIXED_USER_ID,
    eatenOn: dates[i],
    content: m.content,
  }))
  const rows = await db.insert(mealLogs).values(values).returning()
  return rows.map(toMealLog)
}

/** 食事記録を削除する（存在しなければ no-op） */
export async function deleteMealLog(id: string): Promise<void> {
  await db
    .delete(mealLogs)
    .where(and(eq(mealLogs.id, id), eq(mealLogs.userId, FIXED_USER_ID)))
}

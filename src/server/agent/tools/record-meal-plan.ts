import { tool } from "ai"
import { z } from "zod"
import { recordMeals } from "../../services/meal-log"
import type { MealLogContent } from "../../services/meal-log"
import { todayInTokyo } from "../../../lib/date"

const mealSchema = z.object({
  day: z.number().int().min(1).describe("何日目か（1 始まり）"),
  title: z.string().min(1).describe("料理名"),
  ingredients: z
    .array(
      z.object({
        name: z.string().min(1).describe("食材名"),
        amount: z.string().nullable().describe("分量の目安。不明なら null"),
      })
    )
    .min(1)
    .describe("材料（必ず1件以上。繰り返し日でも省略しない）"),
  steps: z
    .array(z.string().min(1))
    .min(1)
    .describe("調理手順（必ず1件以上。繰り返し日でも省略しない）"),
  notes: z.string().nullable().describe("日持ち注意など。無ければ null"),
})

const inputSchema = z.object({
  meals: z
    .array(mealSchema)
    .min(1)
    .describe("承認された献立の各料理。会話中の最新の献立からそのまま転記する"),
  startDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional()
    .describe(
      "献立の開始日（YYYY-MM-DD）。「3日後から」「来月15日から」などユーザーが指定した場合に設定する。省略時は当日起点"
    ),
  overwriteDates: z
    .array(z.string())
    .optional()
    .describe(
      "上書きを承認された日付（YYYY-MM-DD 形式）のリスト。conflicts が返された後、ユーザーが上書きを選んだ日付のみ渡す"
    ),
})

export const recordMealPlanTool = tool({
  description:
    "ユーザーが提案された献立を承認したときに、各料理を食事カレンダーに記録する（meal_logs への INSERT）。承認をはっきり検知したときのみ呼ぶ。提案中・修正中・曖昧な会話では呼ばない。startDate を省略すると当日起点、「3日後から」「来月15日から」などの指定があれば該当日を startDate に設定する。既存記録との衝突がある場合は conflicts を返すので、ユーザーに上書きするか確認してから overwriteDates を指定して再度呼ぶ。",
  inputSchema,
  execute: async ({ meals, startDate, overwriteDates }) => {
    const approvalDate = startDate
      ? (() => {
          const [y, m, d] = startDate.split("-").map(Number)
          return new Date(Date.UTC(y, m - 1, d))
        })()
      : todayInTokyo()
    const contents: { day: number; content: MealLogContent }[] = meals.map(
      (m) => ({
        day: m.day,
        content: {
          title: m.title,
          ingredients: m.ingredients,
          steps: m.steps,
          notes: m.notes,
        },
      })
    )
    const { recorded, conflicts } = await recordMeals(
      contents,
      approvalDate,
      overwriteDates ?? []
    )

    if (conflicts.length > 0) {
      const conflictLines = conflicts
        .map(
          (c) =>
            `- ${c.date}：既存「${c.existingTitle}」← 新規「${c.newTitle}」`
        )
        .join("\n")
      return {
        success: recorded.length > 0,
        recordedCount: recorded.length,
        conflicts,
        message:
          recorded.length > 0
            ? `${recorded.length}件を記録しました。以下の日付は既存の記録と衝突しています。上書きしますか？\n${conflictLines}`
            : `以下の日付に既存の記録があります。上書きしますか？\n${conflictLines}`,
      }
    }

    const dates = [...new Set(recorded.map((r) => r.eatenOn))].sort()
    return {
      success: true,
      recordedCount: recorded.length,
      conflicts: [],
      range: { from: dates[0], to: dates[dates.length - 1] },
      message: `${recorded.length}件の料理を食事カレンダーに記録しました（${dates[0]} 〜 ${dates[dates.length - 1]}）。`,
    }
  },
})

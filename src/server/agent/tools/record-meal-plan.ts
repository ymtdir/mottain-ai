import { tool } from "ai"
import { z } from "zod"
import { recordMeals } from "../../services/meal-log"
import type { MealLogContent } from "../../services/meal-log"

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
    .describe("材料"),
  steps: z.array(z.string()).describe("調理手順"),
  notes: z.string().nullable().describe("日持ち注意など。無ければ null"),
})

const inputSchema = z.object({
  meals: z
    .array(mealSchema)
    .min(1)
    .describe("承認された献立の各料理。会話中の最新の献立からそのまま転記する"),
})

export const recordMealPlanTool = tool({
  description:
    "ユーザーが提案された献立を承認したときに、各料理を食事カレンダーに記録する（meal_logs への INSERT）。承認をはっきり検知したときのみ呼ぶ。提案中・修正中・曖昧な会話では呼ばない。承認日を起点に連続日で記録される。",
  inputSchema,
  execute: async ({ meals }) => {
    const approvalDate = new Date(
      new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" })
    )
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
    const records = await recordMeals(contents, approvalDate)
    const dates = [...new Set(records.map((r) => r.eatenOn))].sort()
    return {
      success: true,
      recordedCount: records.length,
      range: { from: dates[0], to: dates[dates.length - 1] },
      message: `${records.length}件の料理を食事カレンダーに記録しました（${dates[0]} 〜 ${dates[dates.length - 1]}）。`,
    }
  },
})

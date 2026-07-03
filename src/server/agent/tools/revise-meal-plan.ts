import { tool } from "ai"
import { z } from "zod"
import { reviseMealPlan } from "../../services/meal-plan-revise"
import { computeShoppingList } from "../../services/shopping-list"
import { getConstraints } from "../../services/dietary-constraint"
import { checkMealPlanViolations, checkShoppingListViolations } from "../../services/avoidance-guard"

const mealSchema = z.object({
  day: z.number(),
  title: z.string(),
  ingredients: z.array(
    z.object({ name: z.string(), amount: z.string().nullable() }),
  ),
  steps: z.array(z.string()),
  notes: z.string().nullable(),
})

const inputSchema = z.object({
  currentMealPlan: z.object({
    periodDays: z.number(),
    meals: z.array(mealSchema),
  }).describe("現在表示中の献立"),
  inventory: z.array(
    z.object({
      name: z.string(),
      quantity: z.string().nullable(),
      perishability: z.enum(["high", "medium", "low"]),
    }),
  ).describe("手持ち食材（interpretInventory で取得済みのもの）"),
  targetDays: z
    .array(z.number())
    .describe("変更したい日の番号（1 始まり）。例: [2] で 2 日目を変更"),
  instruction: z
    .string()
    .describe("変更内容の指示。例:「魚料理に」「もっと簡単に」「辛さを抑えて」"),
  preferenceNote: z
    .string()
    .nullable()
    .describe(
      "変更理由から抽出した好み・感想。例:「辛いのが苦手」。なければ null",
    ),
})

export const reviseMealPlanTool = tool({
  description:
    "提案済みの献立の指定日を変更し、買い物リストを再整合させる。変更対象以外の日は崩さない。",
  inputSchema,
  execute: async ({ currentMealPlan, inventory, targetDays, instruction, preferenceNote }) => {
    const avoidanceItems = await getConstraints()

    const updatedMealPlan = await reviseMealPlan({
      currentMealPlan,
      request: { targetDays, instruction, preferenceNote },
      inventory,
      avoidanceItems,
    })

    const updatedShoppingList = computeShoppingList(updatedMealPlan, inventory)

    // 回避ガード
    const mealViolations = checkMealPlanViolations(updatedMealPlan, avoidanceItems)
    const shoppingViolations = checkShoppingListViolations(updatedShoppingList, avoidanceItems)
    const violations = [...mealViolations, ...shoppingViolations]

    return {
      updatedMealPlan,
      updatedShoppingList,
      preferenceNote,
      violationNote:
        violations.length > 0
          ? `回避対象（${[...new Set(violations.map((v) => v.avoidanceName))].join("、")}）が含まれていたため差し替えできませんでした。別の指示を試してください。`
          : null,
    }
  },
})

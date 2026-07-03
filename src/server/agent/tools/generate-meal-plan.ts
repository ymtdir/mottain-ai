/**
 * 献立生成ツール（US1 / T023）。
 *
 * 手持ち在庫と希望日数から、N 日分の夕食献立と「不足分だけ」の買い物リストを生成する。
 * 日数バリデーション・買い物リスト差分はコード側の決定的ロジックで担保し、
 * 献立本体の生成のみ LLM に委ねる（research R4）。
 */

import { tool } from "ai"
import { z } from "zod"
import { normalizeInventory } from "../../services/inventory"
import { validateDays, generateMealPlan } from "../../services/meal-plan"
import { computeShoppingList } from "../../services/shopping-list"

const inputSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().describe("食材・調味料の品目名"),
        quantity: z.string().nullable().describe("概算数量。不明なら null"),
      }),
    )
    .describe("確認済みの手持ち食材（ユーザーの修正を反映した最終形）"),
  requestedDays: z
    .number()
    .describe("ユーザーが希望する献立の日数（1〜7 に丸められる）"),
})

export const generateMealPlanTool = tool({
  description:
    "確認済みの手持ち在庫と希望日数から、夕食の献立と不足分だけの買い物リストを生成する。在庫の確認が済んでから呼ぶ。",
  inputSchema,
  execute: async ({ items, requestedDays }) => {
    const inventory = normalizeInventory(items)
    const validation = validateDays(requestedDays)
    const mealPlan = await generateMealPlan({
      inventory,
      days: validation.days,
    })
    const shoppingList = computeShoppingList(mealPlan, inventory)

    return {
      mealPlan,
      shoppingList,
      // 日数が範囲外で補正した場合のみユーザーへ案内する（FR-006）
      dayNote: validation.adjusted ? validation.message : null,
    }
  },
})

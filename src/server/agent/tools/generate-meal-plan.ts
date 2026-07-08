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
import { getConstraints } from "../../services/dietary-constraint"
import {
  getPreference,
  buildPreferenceContext,
} from "../../services/preference"
import {
  checkMealPlanViolations,
  checkShoppingListViolations,
  formatViolationMessage,
} from "../../services/avoidance-guard"

const inputSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().describe("食材・調味料の品目名"),
        quantity: z.string().nullable().describe("概算数量。不明なら null"),
      })
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
    const avoidanceItems = await getConstraints()
    const preferenceMemory = await getPreference()
    const preferenceContext = buildPreferenceContext(preferenceMemory)

    // 1回目の生成（プロンプトで回避を指示）
    let mealPlan = await generateMealPlan({
      inventory,
      days: validation.days,
      avoidanceItems,
      preferenceContext,
    })
    let shoppingList = computeShoppingList(mealPlan, inventory)

    // コード側ガード: 回避違反を検出したらリトライ（FR-013 / T030）
    const mealViolations = checkMealPlanViolations(mealPlan, avoidanceItems)
    const shoppingViolations = checkShoppingListViolations(
      shoppingList,
      avoidanceItems
    )

    if (mealViolations.length > 0 || shoppingViolations.length > 0) {
      const allViolations = [...mealViolations, ...shoppingViolations]
      const violatedNames = [
        ...new Set(allViolations.map((v) => v.avoidanceName)),
      ]
      // 違反した食材名を強調してリトライ（1回のみ）
      const retryContext = `前回の生成で以下の食材が混入したため、絶対に使わないこと: ${violatedNames.join("、")}`
      mealPlan = await generateMealPlan({
        inventory,
        days: validation.days,
        avoidanceItems,
        userContext: retryContext,
        preferenceContext,
      })
      shoppingList = computeShoppingList(mealPlan, inventory)

      // リトライ後もまだ違反があれば violationNote で通知（FR-014 / T032）
      const retryMealViolations = checkMealPlanViolations(
        mealPlan,
        avoidanceItems
      )
      const retryShoppingViolations = checkShoppingListViolations(
        shoppingList,
        avoidanceItems
      )
      const remaining = [...retryMealViolations, ...retryShoppingViolations]

      return {
        mealPlan,
        shoppingList,
        dayNote: validation.adjusted ? validation.message : null,
        violationNote:
          remaining.length > 0 ? formatViolationMessage(remaining) : null,
      }
    }

    return {
      mealPlan,
      shoppingList,
      dayNote: validation.adjusted ? validation.message : null,
      violationNote: null,
    }
  },
})

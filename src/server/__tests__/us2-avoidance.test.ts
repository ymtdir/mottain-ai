import { describe, it, expect } from "vitest"
import { normalizeInventory } from "../services/inventory"
import { validateDays, generateMealPlan } from "../services/meal-plan"
import { computeShoppingList } from "../services/shopping-list"
import {
  checkMealPlanViolations,
  checkShoppingListViolations,
} from "../services/avoidance-guard"
import type { AvoidanceItem } from "../services/avoidance-guard"

/**
 * US2 統合テスト（T026）: 回避対象が献立・買い物リストに 0% 混入しない（SC-001）。
 *
 * generateMealPlan は実 LLM（Gemini / Vertex）を呼ぶため、
 * GOOGLE_CLOUD_PROJECT が設定されている環境でのみ実行する。
 */
const hasCredentials = Boolean(process.env.GOOGLE_CLOUD_PROJECT)

describe.skipIf(!hasCredentials)("US2: 回避食材が献立・買い物リストに混入しない（実 LLM）", () => {
  it("回避食材が献立に 0% 混入しない（SC-001）", async () => {
    const avoidanceItems: AvoidanceItem[] = [
      { name: "えび", aliases: ["海老", "エビ", "蝦"], type: "allergy" },
    ]

    const inventory = normalizeInventory([
      { name: "じゃがいも", quantity: "3個" },
      { name: "人参", quantity: "2本" },
      { name: "玉ねぎ", quantity: "2個" },
    ])
    const { days } = validateDays(3)

    const mealPlan = await generateMealPlan({ inventory, days, avoidanceItems })
    const shoppingList = computeShoppingList(mealPlan, inventory)

    const mealViolations = checkMealPlanViolations(mealPlan, avoidanceItems)
    const shoppingViolations = checkShoppingListViolations(
      shoppingList,
      avoidanceItems,
    )

    expect(mealViolations).toHaveLength(0)
    expect(shoppingViolations).toHaveLength(0)
  }, 60_000)

  it("複数の回避食材がすべて献立に含まれない", async () => {
    const avoidanceItems: AvoidanceItem[] = [
      { name: "牛肉", aliases: ["ビーフ"], type: "dislike" },
      { name: "ピーマン", aliases: [], type: "dislike" },
    ]

    const inventory = normalizeInventory([
      { name: "豚肉", quantity: "300g" },
      { name: "キャベツ", quantity: "1/2個" },
      { name: "にんにく", quantity: "2片" },
    ])
    const { days } = validateDays(2)

    const mealPlan = await generateMealPlan({ inventory, days, avoidanceItems })
    const shoppingList = computeShoppingList(mealPlan, inventory)

    const mealViolations = checkMealPlanViolations(mealPlan, avoidanceItems)
    const shoppingViolations = checkShoppingListViolations(
      shoppingList,
      avoidanceItems,
    )

    expect(mealViolations).toHaveLength(0)
    expect(shoppingViolations).toHaveLength(0)
  }, 60_000)
})

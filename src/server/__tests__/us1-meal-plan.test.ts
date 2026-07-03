import { describe, it, expect } from "vitest"
import { normalizeInventory } from "../services/inventory"
import { validateDays, generateMealPlan } from "../services/meal-plan"
import { computeShoppingList } from "../services/shopping-list"

/**
 * US1 統合テスト（T017）: 在庫 → 献立 → 買い物リストの一連の流れ。
 *
 * generateMealPlan は実 LLM（Gemini / Vertex）を呼ぶため、認証情報
 * （GOOGLE_CLOUD_PROJECT）が無い環境ではスキップする。CI・ローカルで
 * ADC を設定した場合にのみ実行される。
 */
const hasCredentials = Boolean(process.env.GOOGLE_CLOUD_PROJECT)

describe.skipIf(!hasCredentials)("US1: 在庫→献立→買い物リスト（実 LLM）", () => {
  it("指定日数分の献立と、不足分だけの買い物リストを返す", async () => {
    const inventory = normalizeInventory([
      { name: "じゃがいも", quantity: "3個" },
      { name: "人参", quantity: "2本" },
      { name: "玉ねぎ", quantity: "2個" },
      { name: "鶏もも肉", quantity: "300g" },
    ])
    const { days } = validateDays(3)

    const mealPlan = await generateMealPlan({ inventory, days })
    const shoppingList = computeShoppingList(mealPlan, inventory)

    // (a) 指定日数分の献立
    expect(mealPlan.meals).toHaveLength(3)
    mealPlan.meals.forEach((meal, i) => {
      expect(meal.day).toBe(i + 1)
      expect(meal.title).not.toBe("")
    })

    // (b) 買い物リストは手持ちに無い食材のみ（INV-2/SC-002）
    const inStock = new Set(inventory.map((i) => i.name))
    for (const item of shoppingList.items) {
      expect(inStock.has(item.name)).toBe(false)
    }
  }, 60_000)

  it("傷みやすい食材（鶏肉）を含むレシピが早い日に配置される", async () => {
    const inventory = normalizeInventory([
      { name: "じゃがいも", quantity: "5個" },
      { name: "鶏もも肉", quantity: "400g" },
    ])
    const { days } = validateDays(2)

    const mealPlan = await generateMealPlan({ inventory, days })

    // 鶏もも肉（high）を使うレシピが、じゃがいも中心のレシピより先に来る
    const chickenDay = mealPlan.meals.find((m) =>
      m.ingredients.some((i) => i.name.includes("鶏")),
    )?.day
    if (chickenDay !== undefined) {
      expect(chickenDay).toBe(1)
    }
  }, 60_000)
})

import { describe, it, expect } from "vitest"
import { normalizeInventory } from "../services/inventory"
import { validateDays, generateMealPlan } from "../services/meal-plan"
import { reviseMealPlan } from "../services/meal-plan-revise"
import { computeShoppingList } from "../services/shopping-list"

/**
 * US3 統合テスト（T034）: 変更後の買い物リストが更新献立と整合する（SC-006）。
 *
 * generateMealPlan / reviseMealPlan は実 LLM を呼ぶため、
 * GOOGLE_CLOUD_PROJECT が設定されている環境でのみ実行する。
 */
const hasCredentials = Boolean(process.env.GOOGLE_CLOUD_PROJECT)

describe.skipIf(!hasCredentials)("US3: 対話で献立を変更する（実 LLM）", () => {
  it("指定日の献立が変わり、買い物リストが更新後の献立と整合する", async () => {
    const inventory = normalizeInventory([
      { name: "じゃがいも", quantity: "3個" },
      { name: "人参", quantity: "2本" },
      { name: "豚肉", quantity: "200g" },
    ])
    const { days } = validateDays(3)

    // 初回生成
    const original = await generateMealPlan({ inventory, days })
    expect(original.meals).toHaveLength(3)

    const originalDay2Title = original.meals[1].title

    // 2日目を変更
    const revised = await reviseMealPlan({
      currentMealPlan: original,
      request: {
        targetDays: [2],
        instruction: "魚料理にしてほしい",
        preferenceNote: null,
      },
      inventory,
    })

    // 2日目が変わっていること
    expect(revised.meals).toHaveLength(3)
    expect(revised.meals[1].day).toBe(2)
    expect(revised.meals[1].title).not.toBe(originalDay2Title)

    // 1・3日目が変わっていないこと（SC-006: 非対象は崩さない）
    expect(revised.meals[0].title).toBe(original.meals[0].title)
    expect(revised.meals[2].title).toBe(original.meals[2].title)

    // 買い物リストが更新後の献立と整合すること
    const shoppingList = computeShoppingList(revised, inventory)
    const inStock = new Set(inventory.map((i) => i.name))
    for (const item of shoppingList.items) {
      expect(inStock.has(item.name)).toBe(false)
    }
  }, 90_000)
})

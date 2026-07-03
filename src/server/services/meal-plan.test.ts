import { describe, it, expect } from "vitest"
import {
  validateDays,
  orderByPerishability,
  MIN_DAYS,
  MAX_DAYS,
} from "./meal-plan"
import type { Recipe } from "./meal-plan"
import type { InventoryItem } from "./inventory"

describe("validateDays", () => {
  it("範囲内の日数はそのまま採用する", () => {
    expect(validateDays(3)).toEqual({ days: 3, adjusted: false, message: null })
  })

  it("下限を下回る日数は最小日数に補正して案内する", () => {
    const result = validateDays(0)
    expect(result.days).toBe(MIN_DAYS)
    expect(result.adjusted).toBe(true)
    expect(result.message).not.toBeNull()
  })

  it("上限を超える日数は最大日数に補正して案内する", () => {
    const result = validateDays(10)
    expect(result.days).toBe(MAX_DAYS)
    expect(result.adjusted).toBe(true)
    expect(result.message).not.toBeNull()
  })

  it("小数は四捨五入する", () => {
    expect(validateDays(2.4).days).toBe(2)
    expect(validateDays(2.6).days).toBe(3)
  })

  it("数値でない要求は最小日数にフォールバックする", () => {
    const result = validateDays(Number.NaN)
    expect(result.days).toBe(MIN_DAYS)
    expect(result.adjusted).toBe(true)
  })
})

describe("orderByPerishability", () => {
  const recipe = (
    day: number,
    title: string,
    ingredientName: string
  ): Recipe => ({
    day,
    title,
    ingredients: [{ name: ingredientName, amount: null }],
    steps: [],
    notes: null,
  })

  it("傷みやすい食材を使うレシピを早い日に配置し day を振り直す", () => {
    const inventory: InventoryItem[] = [
      { name: "じゃがいも", quantity: null, perishability: "low" },
      { name: "鮭", quantity: null, perishability: "high" },
    ]
    // 日持ちする料理を先に、傷みやすい料理を後に並べた状態で渡す
    const meals: Recipe[] = [
      recipe(1, "肉じゃが", "じゃがいも"),
      recipe(2, "鮭のムニエル", "鮭"),
    ]

    const ordered = orderByPerishability(meals, inventory)

    expect(ordered[0].title).toBe("鮭のムニエル")
    expect(ordered[0].day).toBe(1)
    expect(ordered[1].title).toBe("肉じゃが")
    expect(ordered[1].day).toBe(2)
  })

  it("在庫に無い食材は品目名から日持ちを推定して並べる", () => {
    const meals: Recipe[] = [
      recipe(1, "ポテトサラダ", "じゃがいも"),
      recipe(2, "ほうれん草のおひたし", "ほうれん草"),
    ]

    const ordered = orderByPerishability(meals, [])

    expect(ordered[0].title).toBe("ほうれん草のおひたし")
  })

  it("同スコアのレシピは元の順序を保つ（安定ソート）", () => {
    const meals: Recipe[] = [
      recipe(1, "料理A", "トマト"),
      recipe(2, "料理B", "なす"),
    ]

    const ordered = orderByPerishability(meals, [])

    expect(ordered.map((r) => r.title)).toEqual(["料理A", "料理B"])
  })
})

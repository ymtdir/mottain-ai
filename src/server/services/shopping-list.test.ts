import { describe, it, expect } from "vitest"
import { computeShoppingList } from "./shopping-list"
import type { MealPlan } from "./meal-plan"
import type { InventoryItem } from "./inventory"

const item = (name: string): InventoryItem => ({
  name,
  quantity: null,
  perishability: "medium",
})

const plan = (
  ingredients: { name: string; amount?: string | null }[]
): MealPlan => ({
  periodDays: 1,
  meals: [
    {
      day: 1,
      title: "テスト料理",
      ingredients: ingredients.map((i) => ({
        name: i.name,
        amount: i.amount ?? null,
      })),
      steps: [],
      notes: null,
    },
  ],
})

describe("computeShoppingList", () => {
  it("手持ちにない食材だけを買い物リストに含める（INV-2/SC-002）", () => {
    const mealPlan = plan([
      { name: "豚肉" },
      { name: "玉ねぎ" },
      { name: "醤油" },
    ])
    const inventory = [item("玉ねぎ"), item("醤油")]

    const result = computeShoppingList(mealPlan, inventory)

    expect(result.items.map((i) => i.name)).toEqual(["豚肉"])
  })

  it("手持ちだけで賄える場合は空になる", () => {
    const mealPlan = plan([{ name: "玉ねぎ" }, { name: "人参" }])
    const inventory = [item("玉ねぎ"), item("人参")]

    const result = computeShoppingList(mealPlan, inventory)

    expect(result.items).toEqual([])
  })

  it("複数レシピにまたがる同一食材を 1 品目に集約する", () => {
    const mealPlan: MealPlan = {
      periodDays: 2,
      meals: [
        {
          day: 1,
          title: "カレー",
          ingredients: [{ name: "豚肉", amount: "200g" }],
          steps: [],
          notes: null,
        },
        {
          day: 2,
          title: "生姜焼き",
          ingredients: [{ name: "豚肉", amount: "150g" }],
          steps: [],
          notes: null,
        },
      ],
    }

    const result = computeShoppingList(mealPlan, [])

    expect(result.items).toHaveLength(1)
    expect(result.items[0].name).toBe("豚肉")
    expect(result.items[0].amount).toBe("200g、150g")
  })

  it("分量が無い食材は amount を null にする", () => {
    const mealPlan = plan([{ name: "豚肉" }])

    const result = computeShoppingList(mealPlan, [])

    expect(result.items[0].amount).toBeNull()
  })
})

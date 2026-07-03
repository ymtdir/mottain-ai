import { describe, it, expect } from "vitest"
import {
  checkMealPlanViolations,
  checkShoppingListViolations,
} from "./avoidance-guard"
import type { MealPlan } from "./meal-plan"
import type { ShoppingList } from "./shopping-list"

const sampleMealPlan: MealPlan = {
  periodDays: 2,
  meals: [
    {
      day: 1,
      title: "えびチャーハン",
      ingredients: [
        { name: "えび", amount: "100g" },
        { name: "ごはん", amount: "2合" },
      ],
      steps: [],
      notes: null,
    },
    {
      day: 2,
      title: "カレー",
      ingredients: [
        { name: "じゃがいも", amount: "2個" },
        { name: "人参", amount: "1本" },
      ],
      steps: [],
      notes: null,
    },
  ],
}

const sampleShoppingList: ShoppingList = {
  items: [
    { name: "えびフライ用えび", amount: "200g" },
    { name: "玉ねぎ", amount: "1個" },
  ],
}

describe("checkMealPlanViolations", () => {
  it("回避対象が献立に含まれる場合に違反を検出する", () => {
    const avoidance = [
      { name: "えび", aliases: ["海老", "エビ"], type: "allergy" as const },
    ]
    const violations = checkMealPlanViolations(sampleMealPlan, avoidance)
    expect(violations).toHaveLength(1)
    expect(violations[0].avoidanceName).toBe("えび")
    expect(violations[0].foundIn).toBe("meal")
    expect(violations[0].location).toBe("1日目: えびチャーハン")
  })

  it("回避対象が含まれない場合は空配列を返す", () => {
    const avoidance = [
      { name: "ピーマン", aliases: [], type: "dislike" as const },
    ]
    const violations = checkMealPlanViolations(sampleMealPlan, avoidance)
    expect(violations).toHaveLength(0)
  })

  it("カタカナ→ひらがな正規化で一致する（エビ→えび）", () => {
    const avoidance = [{ name: "エビ", aliases: [], type: "allergy" as const }]
    const violations = checkMealPlanViolations(sampleMealPlan, avoidance)
    expect(violations).toHaveLength(1)
    expect(violations[0].ingredientName).toBe("えび")
  })

  it("aliases で一致する（甲殻類→えびも一致）", () => {
    const avoidance = [
      { name: "甲殻類", aliases: ["えび", "かに"], type: "allergy" as const },
    ]
    const violations = checkMealPlanViolations(sampleMealPlan, avoidance)
    expect(violations.length).toBeGreaterThan(0)
  })

  it("回避対象が空の場合は空配列を返す", () => {
    const violations = checkMealPlanViolations(sampleMealPlan, [])
    expect(violations).toHaveLength(0)
  })

  it("複数の回避対象が一致した場合、すべて報告する", () => {
    const avoidance = [
      { name: "えび", aliases: [], type: "allergy" as const },
      { name: "じゃがいも", aliases: [], type: "dislike" as const },
    ]
    const violations = checkMealPlanViolations(sampleMealPlan, avoidance)
    expect(violations).toHaveLength(2)
  })
})

describe("checkShoppingListViolations", () => {
  it("回避対象が買い物リストに含まれる場合に違反を検出する", () => {
    const avoidance = [
      { name: "えび", aliases: ["海老", "エビ"], type: "allergy" as const },
    ]
    const violations = checkShoppingListViolations(
      sampleShoppingList,
      avoidance
    )
    expect(violations).toHaveLength(1)
    expect(violations[0].foundIn).toBe("shopping")
    expect(violations[0].location).toBe("買い物リスト")
  })

  it("回避対象が買い物リストに含まれない場合は空配列", () => {
    const avoidance = [
      { name: "ピーマン", aliases: [], type: "dislike" as const },
    ]
    const violations = checkShoppingListViolations(
      sampleShoppingList,
      avoidance
    )
    expect(violations).toHaveLength(0)
  })

  it("部分一致（えびフライ用えび → えびで一致）", () => {
    const avoidance = [{ name: "えび", aliases: [], type: "allergy" as const }]
    const violations = checkShoppingListViolations(
      sampleShoppingList,
      avoidance
    )
    expect(violations).toHaveLength(1)
  })
})

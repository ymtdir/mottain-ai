import { describe, it, expect } from "vitest"
import { mealSchema } from "./record-meal-plan"

const validMeal = {
  day: 1,
  title: "カレーライス",
  ingredients: [{ name: "じゃがいも", amount: "2個" }],
  steps: ["野菜を切る", "煮込む"],
  notes: null,
}

describe("mealSchema — ingredients / steps の空配列拒否", () => {
  it("有効なデータを受け入れる", () => {
    expect(mealSchema.safeParse(validMeal).success).toBe(true)
  })

  it("ingredients が空配列のときエラー", () => {
    const result = mealSchema.safeParse({ ...validMeal, ingredients: [] })
    expect(result.success).toBe(false)
  })

  it("steps が空配列のときエラー", () => {
    const result = mealSchema.safeParse({ ...validMeal, steps: [] })
    expect(result.success).toBe(false)
  })

  it("steps に空文字列が含まれるときエラー", () => {
    const result = mealSchema.safeParse({ ...validMeal, steps: [""] })
    expect(result.success).toBe(false)
  })

  it("ingredients と steps が両方空のときエラー", () => {
    const result = mealSchema.safeParse({
      ...validMeal,
      ingredients: [],
      steps: [],
    })
    expect(result.success).toBe(false)
  })

  it("notes は null を受け入れる", () => {
    expect(mealSchema.safeParse({ ...validMeal, notes: null }).success).toBe(
      true
    )
  })
})

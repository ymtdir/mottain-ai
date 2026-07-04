import type { MealPlan } from "./meal-plan"
import type { ShoppingList } from "./shopping-list"

export type AvoidanceItem = {
  name: string
  aliases: string[]
}

export type AvoidanceViolation = {
  avoidanceName: string
  foundIn: "meal" | "shopping"
  location: string
  ingredientName: string
}

function normalize(text: string): string {
  return (
    text
      .toLowerCase()
      .trim()
      // カタカナ → ひらがな
      .replace(/[ァ-ヶ]/g, (ch) => String.fromCharCode(ch.charCodeAt(0) - 0x60))
  )
}

function matches(
  ingredientName: string,
  avoidanceName: string,
  aliases: string[]
): boolean {
  const normIngredient = normalize(ingredientName)
  const allNames = [avoidanceName, ...aliases].map(normalize)
  return allNames.some(
    (name) => normIngredient.includes(name) || name.includes(normIngredient)
  )
}

export function checkMealPlanViolations(
  mealPlan: MealPlan,
  avoidanceItems: AvoidanceItem[]
): AvoidanceViolation[] {
  if (avoidanceItems.length === 0) return []

  const violations: AvoidanceViolation[] = []

  for (const meal of mealPlan.meals) {
    for (const ingredient of meal.ingredients) {
      for (const avoidance of avoidanceItems) {
        if (matches(ingredient.name, avoidance.name, avoidance.aliases)) {
          violations.push({
            avoidanceName: avoidance.name,
            foundIn: "meal",
            location: `${meal.day}日目: ${meal.title}`,
            ingredientName: ingredient.name,
          })
        }
      }
    }
  }

  return violations
}

export function checkShoppingListViolations(
  shoppingList: ShoppingList,
  avoidanceItems: AvoidanceItem[]
): AvoidanceViolation[] {
  if (avoidanceItems.length === 0) return []

  const violations: AvoidanceViolation[] = []

  for (const item of shoppingList.items) {
    for (const avoidance of avoidanceItems) {
      if (matches(item.name, avoidance.name, avoidance.aliases)) {
        violations.push({
          avoidanceName: avoidance.name,
          foundIn: "shopping",
          location: "買い物リスト",
          ingredientName: item.name,
        })
      }
    }
  }

  return violations
}

export function formatViolationMessage(
  violations: AvoidanceViolation[]
): string {
  const names = [...new Set(violations.map((v) => v.avoidanceName))]
  return `回避対象（${names.join("、")}）が献立に含まれていたため、再生成が必要です。`
}

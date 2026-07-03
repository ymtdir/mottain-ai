/**
 * 買い物リストの算出（US1 / FR-009・SC-002）。
 *
 * 献立に必要な食材と手持ち在庫の差分をとり、
 * 「手持ちで不足するぶんだけ」を決定的に算出する（不変条件 INV-2）。
 * 手持ちで足りる食材は含めない。
 */

import { normalizeName } from "./inventory"
import type { InventoryItem } from "./inventory"
import type { Ingredient, MealPlan } from "./meal-plan"

export type ShoppingItem = {
  name: string
  /** 必要な分量の目安。複数レシピにまたがる場合は連結する。不明なら null */
  amount: string | null
}

export type ShoppingList = {
  items: ShoppingItem[]
}

/**
 * 献立と在庫の差分から買い物リストを組み立てる。
 * 在庫に存在する食材（正規化名の一致）は除外し、不足分のみを残す。
 * 同一食材が複数レシピに現れる場合は 1 品目に集約し、分量の目安を連結する。
 */
export function computeShoppingList(
  mealPlan: MealPlan,
  inventory: InventoryItem[],
): ShoppingList {
  const inStock = new Set(inventory.map((item) => normalizeName(item.name)))

  // 正規化名 → 集約中の買い物アイテム
  const needed = new Map<string, { name: string; amounts: string[] }>()

  for (const meal of mealPlan.meals) {
    for (const ingredient of meal.ingredients) {
      const name = normalizeName(ingredient.name)
      if (name === "") continue
      if (inStock.has(name)) continue // 手持ちで足りるものは除外（SC-002）

      const entry = needed.get(name) ?? { name, amounts: [] }
      const amount = normalizeAmount(ingredient)
      if (amount !== null && !entry.amounts.includes(amount)) {
        entry.amounts.push(amount)
      }
      needed.set(name, entry)
    }
  }

  const items: ShoppingItem[] = Array.from(needed.values()).map((entry) => ({
    name: entry.name,
    amount: entry.amounts.length > 0 ? entry.amounts.join("、") : null,
  }))

  return { items }
}

function normalizeAmount(ingredient: Ingredient): string | null {
  if (ingredient.amount == null) return null
  const trimmed = normalizeName(String(ingredient.amount))
  return trimmed === "" ? null : trimmed
}

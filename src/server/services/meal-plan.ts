/**
 * 献立のドメインモデルと決定的ロジック（US1）。
 *
 * 献立の「生成」そのものは LLM に委ねるが（research R4）、
 * - 日数の範囲バリデーション（FR-006）
 * - 傷みやすい食材を早い日に並べる（FR-010）
 * といった不変条件はコード側で決定的に担保する。
 */

import { classifyPerishability } from "./inventory"
import type { InventoryItem, Perishability } from "./inventory"

export type Ingredient = {
  name: string
  /** 分量。曖昧・未指定を許容するため文字列 or null */
  amount: string | null
}

/** 献立を構成する個々の夕食 */
export type Recipe = {
  /** 何日目か（1 始まり） */
  day: number
  title: string
  ingredients: Ingredient[]
  /** 手順の要点 */
  steps: string[]
  /** 日持ち注意など（「早めに使う／冷凍を検討」）。無ければ null */
  notes: string | null
}

/** 指定日数分の夕食の集合 */
export type MealPlan = {
  periodDays: number
  meals: Recipe[]
}

export const MIN_DAYS = 1
export const MAX_DAYS = 7

export type DayValidation = {
  /** 実際に採用する日数（1〜7 に収めた値） */
  days: number
  /** 要求が範囲外で補正したか */
  adjusted: boolean
  /** 補正時にユーザーへ案内する文言。補正なしは null */
  message: string | null
}

/**
 * 要求日数を 1〜7 日に収める（FR-006 / SC-005）。
 * 範囲外は上限内に丸め、案内メッセージを添える。
 */
export function validateDays(requested: number): DayValidation {
  if (!Number.isFinite(requested)) {
    return {
      days: MIN_DAYS,
      adjusted: true,
      message: `日数を読み取れなかったため、${MIN_DAYS}日分で進めます。`,
    }
  }

  const rounded = Math.round(requested)

  if (rounded < MIN_DAYS) {
    return {
      days: MIN_DAYS,
      adjusted: true,
      message: `献立は${MIN_DAYS}〜${MAX_DAYS}日分で承ります。${MIN_DAYS}日分で進めます。`,
    }
  }

  if (rounded > MAX_DAYS) {
    return {
      days: MAX_DAYS,
      adjusted: true,
      message: `献立は最大${MAX_DAYS}日分まで承ります。${MAX_DAYS}日分で進めます。`,
    }
  }

  return { days: rounded, adjusted: false, message: null }
}

const PERISHABILITY_WEIGHT: Record<Perishability, number> = {
  high: 3,
  medium: 2,
  low: 1,
}

/**
 * レシピの傷みやすさスコアを算出する。
 * 食材が在庫にあれば在庫の日持ち区分を、無ければ品目名から推定した区分を用いる。
 * 最も傷みやすい食材の重み（主）と合計（副）を返す。
 */
function perishabilityScore(
  recipe: Recipe,
  inventoryByName: Map<string, InventoryItem>,
): { max: number; sum: number } {
  let max = 0
  let sum = 0
  for (const ingredient of recipe.ingredients) {
    const inv = inventoryByName.get(ingredient.name)
    const perishability = inv
      ? inv.perishability
      : classifyPerishability(ingredient.name)
    const weight = PERISHABILITY_WEIGHT[perishability]
    max = Math.max(max, weight)
    sum += weight
  }
  return { max, sum }
}

/**
 * 傷みやすい食材を使うレシピを早い日に並べ替え、day を振り直す（FR-010）。
 * 元の順序は安定に保ちつつ、傷みやすさスコアの高い順に配置する。
 */
export function orderByPerishability(
  meals: Recipe[],
  inventory: InventoryItem[],
): Recipe[] {
  const inventoryByName = new Map(inventory.map((item) => [item.name, item]))

  const scored = meals.map((recipe, index) => ({
    recipe,
    index,
    score: perishabilityScore(recipe, inventoryByName),
  }))

  scored.sort((a, b) => {
    if (b.score.max !== a.score.max) return b.score.max - a.score.max
    if (b.score.sum !== a.score.sum) return b.score.sum - a.score.sum
    return a.index - b.index // 同点は元の順序を保つ（安定）
  })

  return scored.map(({ recipe }, i) => ({ ...recipe, day: i + 1 }))
}

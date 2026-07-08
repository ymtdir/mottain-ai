/**
 * 献立のドメインモデルと決定的ロジック（US1）。
 *
 * 献立の「生成」そのものは LLM に委ねるが（research R4）、
 * - 日数の範囲バリデーション（FR-006）
 * - 傷みやすい食材を早い日に並べる（FR-010）
 * といった不変条件はコード側で決定的に担保する。
 */

import { generateObject } from "ai"
import { z } from "zod"
import { classifyPerishability } from "./inventory"
import type { InventoryItem, Perishability } from "./inventory"
import { geminiFlash } from "../model/gemini"

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
  inventoryByName: Map<string, InventoryItem>
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
  inventory: InventoryItem[]
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

/** LLM に生成させる 1 レシピの構造（day は生成後にコード側で振る） */
const generatedRecipeSchema = z.object({
  title: z.string().describe("料理名。「○日目」などの日付表記を含めないこと"),
  ingredients: z
    .array(
      z.object({
        name: z.string().describe("食材名"),
        amount: z.string().nullable().describe("分量の目安。不明なら null"),
      })
    )
    .describe("必要な食材と分量"),
  steps: z.array(z.string()).describe("調理手順の要点"),
  notes: z.string().nullable().describe("日持ち注意など。無ければ null"),
})

const generatedMealPlanSchema = z.object({
  meals: z.array(generatedRecipeSchema),
})

export type AvoidanceConstraint = {
  name: string
  aliases: string[]
}

function buildMealPlanPrompt(
  inventory: InventoryItem[],
  days: number,
  avoidanceItems?: AvoidanceConstraint[],
  userContext?: string,
  preferenceContext?: string
): string {
  const inventoryText =
    inventory.length > 0
      ? inventory
          .map(
            (i) =>
              `- ${i.name}${i.quantity ? `（${i.quantity}）` : ""}［日持ち: ${i.perishability}］`
          )
          .join("\n")
      : "（手持ちの申告なし）"

  const parts = [
    `以下の手持ち食材を使って、夕食${days}日分の献立を考えてください。`,
    "",
    "## 手持ち食材",
    inventoryText,
    "",
    "## 制約",
    "- 手持ち食材を献立全体で使い切ることを優先し、余り（廃棄）を最小化する。",
    "- 傷みやすい食材（日持ち high）を優先的に使う。",
    "- 手持ちで足りない食材は使ってよい（買い物リストは別途コード側で算出する）。",
    `- 必ず${days}日分の夕食を生成する（配列の要素数は${days}）。`,
    "- カレー・シチュー・煮物など「まとめて作れる料理」は複数日で計画してよい。その場合、翌日以降も同じ title（例: 「無水カレー」）をそのまま使う。材料・手順は初日の要素にのみ書き、残り日の steps は空にする。",
    "- title（料理名）は純粋な料理名のみとする。「○日目」「（残り）」「（1日目）」などの補足表記を title に含めないこと。",
  ]

  if (avoidanceItems && avoidanceItems.length > 0) {
    const avoidanceList = avoidanceItems
      .map((a) => {
        const aliases =
          a.aliases.length > 0 ? `（別名: ${a.aliases.join("、")}）` : ""
        return `- ${a.name}${aliases}`
      })
      .join("\n")
    parts.push(
      "",
      "## 絶対使用禁止の食材（ハード制約・例外なし）",
      avoidanceList,
      "上記食材はいかなる料理にも使わないこと。これらが必要な料理は選ばないこと。"
    )
  }

  if (preferenceContext && preferenceContext.trim() !== "") {
    parts.push(
      "",
      "## ユーザーの好み（ソフト・可能な範囲で反映）",
      preferenceContext
    )
  }

  if (userContext && userContext.trim() !== "") {
    parts.push("", "## ユーザーの文脈", userContext)
  }

  return parts.join("\n")
}

/**
 * LLM に献立を生成させ、傷みやすさ順に整えて返す（T020 / FR-007・FR-008・FR-010）。
 * 使い切り最適化・日持ち考慮はプロンプトで指示しつつ、
 * 傷みやすい食材の早い日への配置はコード側で決定的に強制する。
 */
export async function generateMealPlan(params: {
  inventory: InventoryItem[]
  days: number
  avoidanceItems?: AvoidanceConstraint[]
  userContext?: string
  preferenceContext?: string
}): Promise<MealPlan> {
  const { inventory, days, avoidanceItems, userContext, preferenceContext } =
    params

  const { object } = await generateObject({
    model: geminiFlash(),
    schema: generatedMealPlanSchema,
    prompt: buildMealPlanPrompt(
      inventory,
      days,
      avoidanceItems,
      userContext,
      preferenceContext
    ),
  })

  const meals: Recipe[] = object.meals.map((meal, index) => ({
    day: index + 1,
    ...meal,
  }))

  return {
    periodDays: days,
    meals: orderByPerishability(meals, inventory),
  }
}

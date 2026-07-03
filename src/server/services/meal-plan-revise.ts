import { generateObject } from "ai"
import { z } from "zod"
import { geminiFlash } from "../model/gemini"
import type { MealPlan, Recipe, AvoidanceConstraint } from "./meal-plan"
import type { InventoryItem } from "./inventory"

export type RevisionRequest = {
  /** 変更対象の日番号（1 始まり） */
  targetDays: number[]
  /** 変更内容の指示（「魚料理に」「もっと簡単に」など） */
  instruction: string
  /** 変更理由から抽出した好み（US4 への引き渡し用）。なければ null */
  preferenceNote: string | null
}

const replacementRecipeSchema = z.object({
  day: z.number().describe("何日目か（変更対象の日番号をそのまま使う）"),
  title: z.string().describe("料理名"),
  ingredients: z
    .array(
      z.object({
        name: z.string().describe("食材名"),
        amount: z.string().nullable().describe("分量の目安。不明なら null"),
      }),
    )
    .describe("必要な食材と分量"),
  steps: z.array(z.string()).describe("調理手順の要点"),
  notes: z.string().nullable().describe("日持ち注意など。無ければ null"),
})

const revisionResultSchema = z.object({
  meals: z.array(replacementRecipeSchema),
})

function buildRevisionPrompt(
  currentMealPlan: MealPlan,
  request: RevisionRequest,
  inventory: InventoryItem[],
  avoidanceItems?: AvoidanceConstraint[],
): string {
  const currentMeals = currentMealPlan.meals
    .map((m) => {
      const isTarget = request.targetDays.includes(m.day)
      const marker = isTarget ? "【変更対象】" : ""
      return `${m.day}日目${marker}: ${m.title}`
    })
    .join("\n")

  const inventoryText =
    inventory.length > 0
      ? inventory.map((i) => `- ${i.name}${i.quantity ? `（${i.quantity}）` : ""}`).join("\n")
      : "（手持ちの申告なし）"

  const targetDaysText = request.targetDays.join("・") + "日目"

  const parts = [
    "以下の献立の一部を変更してください。",
    "",
    "## 現在の献立",
    currentMeals,
    "",
    `## 変更依頼（${targetDaysText}）`,
    request.instruction,
    "",
    "## 制約",
    `- 変更対象（${targetDaysText}）のみ新しいレシピを考える。それ以外の日は変えない。`,
    "- 手持ち食材を優先して使う。",
    "",
    "## 手持ち食材",
    inventoryText,
  ]

  if (avoidanceItems && avoidanceItems.length > 0) {
    const list = avoidanceItems
      .map((a) => {
        const aliases = a.aliases.length > 0 ? `（別名: ${a.aliases.join("、")}）` : ""
        const label = a.type === "allergy" ? "アレルギー" : "苦手"
        return `- ${a.name}${aliases}【${label}】`
      })
      .join("\n")
    parts.push(
      "",
      "## 絶対使用禁止の食材（ハード制約・例外なし）",
      list,
      "上記食材はいかなる料理にも使わないこと。",
    )
  }

  parts.push(
    "",
    `変更対象の日（${targetDaysText}）の新しいレシピだけを返してください。`,
  )

  return parts.join("\n")
}

/**
 * 既存の献立の指定日だけを差し替えて返す（FR-016/017）。
 * 変更対象外の日は元のまま保持する。
 */
export async function reviseMealPlan(params: {
  currentMealPlan: MealPlan
  request: RevisionRequest
  inventory: InventoryItem[]
  avoidanceItems?: AvoidanceConstraint[]
}): Promise<MealPlan> {
  const { currentMealPlan, request, inventory, avoidanceItems } = params

  const { object } = await generateObject({
    model: geminiFlash(),
    schema: revisionResultSchema,
    prompt: buildRevisionPrompt(
      currentMealPlan,
      request,
      inventory,
      avoidanceItems,
    ),
  })

  // 変更対象日を新レシピで置き換え、それ以外は元のまま保つ
  const replacementByDay = new Map<number, Recipe>(
    object.meals.map((m) => [
      m.day,
      { ...m, ingredients: m.ingredients.map((i) => ({ ...i, amount: i.amount ?? null })) },
    ]),
  )

  const updatedMeals = currentMealPlan.meals.map((meal) =>
    replacementByDay.has(meal.day)
      ? { ...(replacementByDay.get(meal.day) as Recipe) }
      : meal,
  )

  return {
    periodDays: currentMealPlan.periodDays,
    meals: updatedMeals,
  }
}

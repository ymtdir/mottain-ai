import { db } from "../db/client"
import { preferenceProfiles } from "../db/schema"
import { eq } from "drizzle-orm"
import { z } from "zod"
import { FIXED_USER_ID } from "../db/constants"
import { ensureUser } from "../db/ensure-user"

/** 全体的な味の傾向（「辛さを抑える」「塩分を控える」など） */
export type GlobalTendency = {
  attribute: string
  adjustmentNote: string
  updatedAt: string
}

/** レシピ固有の調整（「麻婆豆腐→辛さを半分に」など） */
export type RecipeAdjustment = {
  recipeName: string
  adjustments: string[]
  updatedAt: string
}

export type PreferenceMemory = {
  globalTendencies: GlobalTendency[]
  recipeAdjustments: RecipeAdjustment[]
}

export const EMPTY_PREFERENCE: PreferenceMemory = {
  globalTendencies: [],
  recipeAdjustments: [],
}

const preferenceMemorySchema = z.object({
  globalTendencies: z
    .array(
      z.object({
        attribute: z.string(),
        adjustmentNote: z.string(),
        updatedAt: z.string(),
      })
    )
    .default([]),
  recipeAdjustments: z
    .array(
      z.object({
        recipeName: z.string(),
        adjustments: z.array(z.string()),
        updatedAt: z.string(),
      })
    )
    .default([]),
})

// コンテキスト注入時のトークン肥大を防ぐ上限（R8 未決事項の対応）
const MAX_TENDENCIES = 20
const MAX_RECIPE_ADJUSTMENTS = 30

/**
 * 好みメモリをマージする（FR-021/023）。
 * 同じ attribute / recipeName は直近（update 側）を優先する。
 */

export function mergePreference(
  existing: PreferenceMemory,
  update: Partial<PreferenceMemory>
): PreferenceMemory {
  const tendencies = [...existing.globalTendencies]
  for (const incoming of update.globalTendencies ?? []) {
    const idx = tendencies.findIndex((t) => t.attribute === incoming.attribute)
    if (idx >= 0) {
      tendencies[idx] = incoming
    } else {
      tendencies.push(incoming)
    }
  }

  const recipes = [...existing.recipeAdjustments]
  for (const incoming of update.recipeAdjustments ?? []) {
    const idx = recipes.findIndex((r) => r.recipeName === incoming.recipeName)
    if (idx >= 0) {
      recipes[idx] = incoming
    } else {
      recipes.push(incoming)
    }
  }

  // 上限超過分は updatedAt の古い順に剪定する（直近を優先）
  const trimByDate = <T extends { updatedAt: string }>(
    arr: T[],
    max: number
  ): T[] =>
    arr.length <= max
      ? arr
      : [...arr]
          .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
          .slice(0, max)

  return {
    globalTendencies: trimByDate(tendencies, MAX_TENDENCIES),
    recipeAdjustments: trimByDate(recipes, MAX_RECIPE_ADJUSTMENTS),
  }
}

export function isEmptyPreference(mem: PreferenceMemory): boolean {
  return mem.globalTendencies.length === 0 && mem.recipeAdjustments.length === 0
}

export async function getPreference(): Promise<PreferenceMemory> {
  const row = await db.query.preferenceProfiles.findFirst({
    where: eq(preferenceProfiles.userId, FIXED_USER_ID),
  })
  if (!row) return { ...EMPTY_PREFERENCE }
  const parsed = preferenceMemorySchema.safeParse(row.memory)
  return parsed.success ? parsed.data : { ...EMPTY_PREFERENCE }
}

export async function upsertPreference(mem: PreferenceMemory): Promise<void> {
  await ensureUser()
  await db
    .insert(preferenceProfiles)
    .values({ userId: FIXED_USER_ID, memory: mem })
    .onConflictDoUpdate({
      target: preferenceProfiles.userId,
      set: { memory: mem, updatedAt: new Date() },
    })
}

export async function applyPreferenceFeedback(
  update: Partial<PreferenceMemory>
): Promise<PreferenceMemory> {
  const existing = await getPreference()
  const merged = mergePreference(existing, update)
  await upsertPreference(merged)
  return merged
}

/** LLM プロンプトに注入するテキストを生成する（T043/T045） */
export function buildPreferenceContext(mem: PreferenceMemory): string {
  if (isEmptyPreference(mem)) return ""

  const lines: string[] = []

  if (mem.globalTendencies.length > 0) {
    lines.push("【全体的な傾向】")
    for (const t of mem.globalTendencies) {
      lines.push(`- ${t.adjustmentNote}`)
    }
  }

  if (mem.recipeAdjustments.length > 0) {
    lines.push("【レシピ固有の調整】")
    for (const r of mem.recipeAdjustments) {
      lines.push(`- ${r.recipeName}: ${r.adjustments.join("、")}`)
    }
  }

  return lines.join("\n")
}

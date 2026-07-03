import { db } from "../db/client"
import { preferenceProfiles } from "../db/schema"
import { eq } from "drizzle-orm"
import { FIXED_USER_ID } from "../agent/context"

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

  return { globalTendencies: tendencies, recipeAdjustments: recipes }
}

export function isEmptyPreference(mem: PreferenceMemory): boolean {
  return mem.globalTendencies.length === 0 && mem.recipeAdjustments.length === 0
}

export async function getPreference(): Promise<PreferenceMemory> {
  const row = await db.query.preferenceProfiles.findFirst({
    where: eq(preferenceProfiles.userId, FIXED_USER_ID),
  })
  if (!row) return { ...EMPTY_PREFERENCE }
  const raw = row.memory as Partial<PreferenceMemory>
  return {
    globalTendencies: raw.globalTendencies ?? [],
    recipeAdjustments: raw.recipeAdjustments ?? [],
  }
}

export async function upsertPreference(mem: PreferenceMemory): Promise<void> {
  const existing = await db.query.preferenceProfiles.findFirst({
    where: eq(preferenceProfiles.userId, FIXED_USER_ID),
  })
  if (existing) {
    await db
      .update(preferenceProfiles)
      .set({ memory: mem, updatedAt: new Date() })
      .where(eq(preferenceProfiles.userId, FIXED_USER_ID))
  } else {
    await db.insert(preferenceProfiles).values({
      userId: FIXED_USER_ID,
      memory: mem,
    })
  }
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

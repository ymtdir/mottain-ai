import { db } from "../db/client"
import { dietaryConstraints, preferenceProfiles } from "../db/schema"
import { eq } from "drizzle-orm"
import {
  buildPreferenceContext,
  isEmptyPreference,
} from "../services/preference"
import type { PreferenceMemory } from "../services/preference"
import { FIXED_USER_ID } from "../db/constants"

export type UserContext = {
  avoidanceItems: Array<{
    name: string
    aliases: string[]
    type: "allergy" | "dislike"
  }>
  preferenceMemory: PreferenceMemory
}

export async function loadUserContext(): Promise<UserContext> {
  const [constraint, preference] = await Promise.all([
    db.query.dietaryConstraints.findFirst({
      where: eq(dietaryConstraints.userId, FIXED_USER_ID),
    }),
    db.query.preferenceProfiles.findFirst({
      where: eq(preferenceProfiles.userId, FIXED_USER_ID),
    }),
  ])

  const raw = (preference?.memory ?? {}) as Partial<PreferenceMemory>

  return {
    avoidanceItems: (constraint?.items ?? []) as UserContext["avoidanceItems"],
    preferenceMemory: {
      globalTendencies: raw.globalTendencies ?? [],
      recipeAdjustments: raw.recipeAdjustments ?? [],
    },
  }
}

export function buildSystemPrompt(ctx: UserContext): string {
  const parts: string[] = [
    "あなたは献立エージェントです。ユーザーが伝えた在庫を使い切ることを優先し、N日分の夕食献立と不足食材の買い物リストを提案します。",
  ]

  // 回避制約（ハード）— 好みより常に優先する（FR-024）
  if (ctx.avoidanceItems.length > 0) {
    const list = ctx.avoidanceItems
      .map(
        (i) => `${i.name}（${i.type === "allergy" ? "アレルギー" : "苦手"}）`
      )
      .join("、")
    parts.push(
      `\n## 絶対に使用禁止の食材（ハード制約・例外なし）\n${list}\n上記は献立・買い物リストのいずれにも含めないでください。回避すると成立しない場合は混入させず、その旨と代替案を伝えてください。`
    )
  }

  // 好みメモリ（ソフト）— 学習不足時は空でフォールバック（FR-022）
  if (!isEmptyPreference(ctx.preferenceMemory)) {
    const preferenceText = buildPreferenceContext(ctx.preferenceMemory)
    parts.push(
      `\n## ユーザーの好み（ソフト・可能な範囲で反映）\n${preferenceText}`
    )
  }

  return parts.join("\n")
}

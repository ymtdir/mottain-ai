import { describe, it, expect } from "vitest"
import { normalizeInventory } from "./inventory"
import { validateDays, generateMealPlan } from "./meal-plan"
import {
  mergePreference,
  isEmptyPreference,
  buildPreferenceContext,
  EMPTY_PREFERENCE,
} from "./preference"
import type { PreferenceMemory } from "./preference"

const hasCredentials = Boolean(process.env.GOOGLE_CLOUD_PROJECT)

// ── 決定的ロジック（常時実行）──────────────────────────────

describe("PreferenceMemory: mergePreference（FR-021/023）", () => {
  it("新しい全体傾向を追加できる", () => {
    const result = mergePreference(EMPTY_PREFERENCE, {
      globalTendencies: [
        {
          attribute: "spiciness",
          adjustmentNote: "辛さを抑える",
          updatedAt: "2026-07-04T00:00:00Z",
        },
      ],
    })
    expect(result.globalTendencies).toHaveLength(1)
    expect(result.globalTendencies[0].adjustmentNote).toBe("辛さを抑える")
  })

  it("同じ attribute は直近で上書きされる（FR-023）", () => {
    const existing: PreferenceMemory = {
      globalTendencies: [
        {
          attribute: "spiciness",
          adjustmentNote: "辛さを増やす",
          updatedAt: "2026-07-01T00:00:00Z",
        },
      ],
      recipeAdjustments: [],
    }
    const result = mergePreference(existing, {
      globalTendencies: [
        {
          attribute: "spiciness",
          adjustmentNote: "辛さを抑える",
          updatedAt: "2026-07-04T00:00:00Z",
        },
      ],
    })
    expect(result.globalTendencies).toHaveLength(1)
    expect(result.globalTendencies[0].adjustmentNote).toBe("辛さを抑える")
  })

  it("異なる attribute は両方保持する", () => {
    const existing: PreferenceMemory = {
      globalTendencies: [
        {
          attribute: "spiciness",
          adjustmentNote: "辛さを抑える",
          updatedAt: "2026-07-01T00:00:00Z",
        },
      ],
      recipeAdjustments: [],
    }
    const result = mergePreference(existing, {
      globalTendencies: [
        {
          attribute: "saltiness",
          adjustmentNote: "塩分を控える",
          updatedAt: "2026-07-04T00:00:00Z",
        },
      ],
    })
    expect(result.globalTendencies).toHaveLength(2)
  })

  it("同じレシピ名は直近で上書きされる（FR-023）", () => {
    const existing: PreferenceMemory = {
      globalTendencies: [],
      recipeAdjustments: [
        {
          recipeName: "生姜焼き",
          adjustments: ["しょっぱいので塩を控える"],
          updatedAt: "2026-07-01T00:00:00Z",
        },
      ],
    }
    const result = mergePreference(existing, {
      recipeAdjustments: [
        {
          recipeName: "生姜焼き",
          adjustments: ["塩を半量に", "砂糖を増やす"],
          updatedAt: "2026-07-04T00:00:00Z",
        },
      ],
    })
    expect(result.recipeAdjustments).toHaveLength(1)
    expect(result.recipeAdjustments[0].adjustments).toContain("塩を半量に")
  })
})

describe("buildPreferenceContext（T043）", () => {
  it("空の好みメモリは空文字を返す（FR-022 フォールバック）", () => {
    expect(buildPreferenceContext(EMPTY_PREFERENCE)).toBe("")
    expect(isEmptyPreference(EMPTY_PREFERENCE)).toBe(true)
  })

  it("全体傾向とレシピ固有調整を人読みできる形式で返す", () => {
    const mem: PreferenceMemory = {
      globalTendencies: [
        {
          attribute: "spiciness",
          adjustmentNote: "辛さを抑える",
          updatedAt: "2026-07-04T00:00:00Z",
        },
      ],
      recipeAdjustments: [
        {
          recipeName: "生姜焼き",
          adjustments: ["塩を半量に"],
          updatedAt: "2026-07-04T00:00:00Z",
        },
      ],
    }
    const ctx = buildPreferenceContext(mem)
    expect(ctx).toContain("辛さを抑える")
    expect(ctx).toContain("生姜焼き")
    expect(ctx).toContain("塩を半量に")
  })
})

// ── LLM 統合テスト（ADC 設定時のみ）───────────────────────

describe.skipIf(!hasCredentials)(
  "US4: 好みが献立生成プロンプトに注入される（実 LLM）",
  () => {
    it("好みコンテキストを渡すと generateMealPlan がエラーなく動く（T039）", async () => {
      const inventory = normalizeInventory([
        { name: "豚肉", quantity: "300g" },
        { name: "キャベツ", quantity: "1/2個" },
      ])
      const { days } = validateDays(2)
      const preferenceContext = "【全体的な傾向】\n- 辛さを抑える"

      const mealPlan = await generateMealPlan({
        inventory,
        days,
        userContext: preferenceContext,
      })
      expect(mealPlan.meals).toHaveLength(2)
    }, 60_000)
  }
)

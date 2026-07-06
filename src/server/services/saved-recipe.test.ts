import { describe, it, expect } from "vitest"
import type { SavedRecipeContent } from "./saved-recipe"
import { normalizeTitle, validateContent, toListItem } from "./saved-recipe"

// INV-1: 重複登録が二重に増えない（normalizedTitle による判定）
describe("normalizeTitle", () => {
  it("前後の空白を除去する", () => {
    expect(normalizeTitle("  カレーライス  ")).toBe("カレーライス")
  })

  it("連続空白を1つに畳む", () => {
    expect(normalizeTitle("カレー  ライス")).toBe("カレー ライス")
  })

  it("同じタイトルの正規化結果は一致する（重複判定の根拠）", () => {
    expect(normalizeTitle("  カレーライス  ")).toBe(
      normalizeTitle("カレーライス")
    )
  })

  it("異なるタイトルの正規化結果は一致しない", () => {
    expect(normalizeTitle("カレーライス")).not.toBe(normalizeTitle("唐揚げ"))
  })
})

// Edge Case: 空題の拒否・空 steps の許容
describe("validateContent", () => {
  const base: SavedRecipeContent = {
    title: "カレーライス",
    ingredients: [{ name: "じゃがいも", amount: "2個" }],
    steps: ["煮る", "盛る"],
    notes: null,
  }

  it("有効なコンテンツはバリデーションを通過する", () => {
    expect(validateContent(base)).toEqual({ valid: true })
  })

  it("空のタイトルは拒否する（FR-002）", () => {
    const result = validateContent({ ...base, title: "" })
    expect(result.valid).toBe(false)
  })

  it("空白のみのタイトルは拒否する（FR-002）", () => {
    const result = validateContent({ ...base, title: "   " })
    expect(result.valid).toBe(false)
  })

  it("steps が空配列でも許容する（Edge Case: 残り物レシピ等）", () => {
    expect(validateContent({ ...base, steps: [] })).toEqual({ valid: true })
  })

  it("ingredients が空配列でも許容する", () => {
    expect(validateContent({ ...base, ingredients: [] })).toEqual({
      valid: true,
    })
  })
})

// INV-2: 一覧応答に画像バイトを含めない
describe("toListItem", () => {
  it("illustrationData を含まない（INV-2）", () => {
    const row = {
      id: "uuid-1",
      userId: "user-1",
      normalizedTitle: "カレーライス",
      content: {
        title: "カレーライス",
        ingredients: [],
        steps: [],
        notes: null,
      },
      illustrationStatus: "pending",
      illustrationData: Buffer.from("fake-bytes"),
      illustrationMime: null,
      illustrationError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const item = toListItem(row)
    expect("illustrationData" in item).toBe(false)
  })

  it("illustrationStatus を IllustrationStatus 型として返す", () => {
    const row = {
      id: "uuid-2",
      userId: "user-1",
      normalizedTitle: "唐揚げ",
      content: { title: "唐揚げ", ingredients: [], steps: [], notes: null },
      illustrationStatus: "ready",
      illustrationData: null,
      illustrationMime: "image/png",
      illustrationError: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    }
    const item = toListItem(row)
    expect(item.illustrationStatus).toBe("ready")
    expect(item.illustrationMime).toBe("image/png")
  })
})

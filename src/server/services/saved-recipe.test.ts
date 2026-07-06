import { describe, it, expect } from "vitest"
import type { SavedRecipeContent } from "./saved-recipe"
import {
  normalizeTitle,
  validateContent,
  toListItem,
  isStaleGenerating,
  shouldStartIllustration,
  ILLUSTRATION_LEASE_MS,
} from "./saved-recipe"

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

// INV-3: 生成状況の状態遷移（stale 再キック・冪等）
describe("isStaleGenerating", () => {
  const now = new Date("2026-07-06T12:00:00Z")

  it("generating がリース期限を超えたら stale と判定する", () => {
    const updatedAt = new Date(now.getTime() - ILLUSTRATION_LEASE_MS - 1000)
    expect(isStaleGenerating("generating", updatedAt, now)).toBe(true)
  })

  it("generating がリース期限内なら stale ではない", () => {
    const updatedAt = new Date(now.getTime() - 1000)
    expect(isStaleGenerating("generating", updatedAt, now)).toBe(false)
  })

  it("generating 以外の status は stale ではない", () => {
    const old = new Date(now.getTime() - ILLUSTRATION_LEASE_MS - 1000)
    expect(isStaleGenerating("pending", old, now)).toBe(false)
    expect(isStaleGenerating("ready", old, now)).toBe(false)
    expect(isStaleGenerating("failed", old, now)).toBe(false)
  })
})

describe("shouldStartIllustration", () => {
  const now = new Date("2026-07-06T12:00:00Z")
  const fresh = new Date(now.getTime() - 1000)
  const stale = new Date(now.getTime() - ILLUSTRATION_LEASE_MS - 1000)

  it("pending は生成を開始する", () => {
    expect(shouldStartIllustration("pending", fresh, now)).toBe(true)
  })

  it("failed は再試行で生成を開始する（FR-015）", () => {
    expect(shouldStartIllustration("failed", fresh, now)).toBe(true)
  })

  it("非 stale の generating は再キックしない（冪等・二重生成防止）", () => {
    expect(shouldStartIllustration("generating", fresh, now)).toBe(false)
  })

  it("stale な generating は再キックする（クラッシュ復旧）", () => {
    expect(shouldStartIllustration("generating", stale, now)).toBe(true)
  })

  it("ready は何もしない", () => {
    expect(shouldStartIllustration("ready", fresh, now)).toBe(false)
  })
})

import { describe, it, expect } from "vitest"
import type { SavedRecipeContent } from "./saved-recipe"
import { buildIllustrationPrompt } from "./illustration"

const base: SavedRecipeContent = {
  title: "カレーライス",
  ingredients: [{ name: "じゃがいも", amount: "2個" }],
  steps: ["煮る", "盛る"],
  notes: null,
}

describe("buildIllustrationPrompt", () => {
  it("タイトルを含む日本語プロンプト文字列を返す", () => {
    const prompt = buildIllustrationPrompt(base)
    expect(typeof prompt).toBe("string")
    expect(prompt).toContain("カレーライス")
  })

  it("異なるタイトルで異なるプロンプトを生成する", () => {
    const prompt1 = buildIllustrationPrompt(base)
    const prompt2 = buildIllustrationPrompt({ ...base, title: "唐揚げ" })
    expect(prompt1).not.toBe(prompt2)
    expect(prompt2).toContain("唐揚げ")
  })
})

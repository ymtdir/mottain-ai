import { describe, it, expect } from "vitest"
import {
  classifyPerishability,
  normalizeName,
  normalizeInventory,
} from "./inventory"

describe("classifyPerishability", () => {
  it("葉物・生鮮は high に分類する", () => {
    expect(classifyPerishability("ほうれん草")).toBe("high")
    expect(classifyPerishability("鶏もも肉")).toBe("high")
    expect(classifyPerishability("豆腐")).toBe("high")
    expect(classifyPerishability("しめじ")).toBe("high")
  })

  it("根菜・調味料・乾物は low に分類する", () => {
    expect(classifyPerishability("じゃがいも")).toBe("low")
    expect(classifyPerishability("玉ねぎ")).toBe("low")
    expect(classifyPerishability("人参")).toBe("low")
    expect(classifyPerishability("醤油")).toBe("low")
  })

  it("辞書に無い品目は medium を既定にする", () => {
    expect(classifyPerishability("トマト")).toBe("medium")
    expect(classifyPerishability("謎の食材")).toBe("medium")
  })
})

describe("normalizeName", () => {
  it("前後の空白を除去する", () => {
    expect(normalizeName("  玉ねぎ  ")).toBe("玉ねぎ")
  })

  it("全角空白を半角に畳んでからトリムする", () => {
    expect(normalizeName("　人参　")).toBe("人参")
  })
})

describe("normalizeInventory", () => {
  it("日持ち区分を付与して構造化する", () => {
    const result = normalizeInventory([
      { name: "じゃがいも", quantity: "3個" },
      { name: "鶏もも肉", quantity: "300g" },
    ])
    expect(result).toEqual([
      { name: "じゃがいも", quantity: "3個", perishability: "low" },
      { name: "鶏もも肉", quantity: "300g", perishability: "high" },
    ])
  })

  it("数量が無い場合は null にする", () => {
    const result = normalizeInventory([{ name: "玉ねぎ" }])
    expect(result[0]).toEqual({
      name: "玉ねぎ",
      quantity: null,
      perishability: "low",
    })
  })

  it("空の品目名を除外する", () => {
    const result = normalizeInventory([{ name: "  " }, { name: "人参" }])
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe("人参")
  })

  it("同名品目は先勝ちで重複排除する", () => {
    const result = normalizeInventory([
      { name: "玉ねぎ", quantity: "2個" },
      { name: "玉ねぎ", quantity: "5個" },
    ])
    expect(result).toHaveLength(1)
    expect(result[0].quantity).toBe("2個")
  })
})

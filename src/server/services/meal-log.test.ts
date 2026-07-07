import { describe, it, expect } from "vitest"
import { assignDates, monthRange } from "./meal-log"

describe("assignDates", () => {
  it("1日分: 承認日当日に写像する", () => {
    const approvalDate = new Date(Date.UTC(2026, 6, 10))
    const result = assignDates([{ day: 1 }], approvalDate)
    expect(result).toEqual(["2026-07-10"])
  })

  it("3日分: 承認日起点で連続日に写像する", () => {
    const approvalDate = new Date(Date.UTC(2026, 6, 10))
    const result = assignDates(
      [{ day: 1 }, { day: 2 }, { day: 3 }],
      approvalDate
    )
    expect(result).toEqual(["2026-07-10", "2026-07-11", "2026-07-12"])
  })

  it("月またぎ: 7/30 承認の3日分が 8/1 をまたぐ", () => {
    const approvalDate = new Date(Date.UTC(2026, 6, 30))
    const result = assignDates(
      [{ day: 1 }, { day: 2 }, { day: 3 }],
      approvalDate
    )
    expect(result).toEqual(["2026-07-30", "2026-07-31", "2026-08-01"])
  })

  it("同一 day が複数あれば同じ eatenOn を返す", () => {
    const approvalDate = new Date(Date.UTC(2026, 6, 10))
    const result = assignDates([{ day: 1 }, { day: 1 }], approvalDate)
    expect(result).toEqual(["2026-07-10", "2026-07-10"])
  })
})

describe("monthRange", () => {
  it("月初と翌月初を返す（通常月）", () => {
    expect(monthRange("2026-07")).toEqual({
      from: "2026-07-01",
      to: "2026-08-01",
    })
  })

  it("12月: 翌年の1月初を返す（年またぎ）", () => {
    expect(monthRange("2026-12")).toEqual({
      from: "2026-12-01",
      to: "2027-01-01",
    })
  })

  it("1月: from は 1/1、to は 2/1", () => {
    expect(monthRange("2026-01")).toEqual({
      from: "2026-01-01",
      to: "2026-02-01",
    })
  })

  it("月末日は from に含まれ to には含まれない（2月）", () => {
    const { from, to } = monthRange("2026-02")
    expect(from).toBe("2026-02-01")
    expect(to).toBe("2026-03-01")
  })
})

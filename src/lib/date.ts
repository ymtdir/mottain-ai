/** Asia/Tokyo の現在日付を UTC 00:00:00 の Date として返す */
export function todayInTokyo(): Date {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date())
  const m = Object.fromEntries(parts.map((p) => [p.type, p.value]))
  return new Date(Date.UTC(Number(m.year), Number(m.month) - 1, Number(m.day)))
}

/** Date（UTC 基準）を "YYYY-MM" 文字列に変換する */
export function toYearMonth(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`
}

/** Date（UTC 基準）を "YYYY-MM-DD" 文字列に変換する */
export function toDateString(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`
}

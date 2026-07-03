/**
 * 在庫アイテムのドメインモデルと正規化（US1 / FR-002・FR-010）。
 *
 * 在庫はセッション内のみで保持する非永続データ（research R3）。
 * ここでは発話から抽出済みの生データを、日持ち区分を付与した構造化在庫に整える。
 */

/** 一般的な日持ち区分。個別の消費期限は持たず、ドメイン知識で付与する（FR-010） */
export type Perishability = "high" | "medium" | "low"

export type InventoryItem = {
  /** 品目（正規化名） */
  name: string
  /** 概算数量。曖昧・不明を許容するため文字列。不明時は null（FR-002） */
  quantity: string | null
  /** 一般的な日持ち区分 */
  perishability: Perishability
}

/** 抽出直後の生の在庫（日持ち区分が未付与） */
export type RawInventoryItem = {
  name: string
  quantity?: string | null
}

/**
 * 日持ち区分を推定するためのキーワード辞書。
 * 品目名に部分一致で判定する。該当しない品目は既定で "medium"。
 */
const PERISHABILITY_KEYWORDS: Record<Perishability, string[]> = {
  // 傷みやすい: 葉物・生鮮魚介・肉・豆腐・きのこ・もやし など
  high: [
    "魚",
    "刺身",
    "鮭",
    "さけ",
    "さば",
    "鯖",
    "いわし",
    "あじ",
    "まぐろ",
    "えび",
    "海老",
    "いか",
    "貝",
    "肉",
    "鶏",
    "豚",
    "牛",
    "ひき肉",
    "ハム",
    "ソーセージ",
    "豆腐",
    "納豆",
    "もやし",
    "ほうれん草",
    "小松菜",
    "レタス",
    "サラダ",
    "ニラ",
    "にら",
    "水菜",
    "きのこ",
    "しめじ",
    "えのき",
    "しいたけ",
    "まいたけ",
    "牛乳",
    "生クリーム",
  ],
  // 日持ちする: 根菜・乾物・調味料・冷凍・保存食 など
  low: [
    "じゃがいも",
    "ジャガイモ",
    "玉ねぎ",
    "たまねぎ",
    "玉葱",
    "人参",
    "にんじん",
    "ニンジン",
    "ごぼう",
    "れんこん",
    "かぼちゃ",
    "さつまいも",
    "米",
    "パスタ",
    "乾麺",
    "小麦粉",
    "砂糖",
    "塩",
    "醤油",
    "しょうゆ",
    "味噌",
    "みそ",
    "酢",
    "油",
    "みりん",
    "酒",
    "缶",
    "乾",
    "冷凍",
    "パン粉",
    "だし",
  ],
  // medium は既定値。辞書には持たせない
  medium: [],
}

/** 品目名から一般的な日持ち区分を推定する。該当なしは "medium" */
export function classifyPerishability(name: string): Perishability {
  for (const keyword of PERISHABILITY_KEYWORDS.high) {
    if (name.includes(keyword)) return "high"
  }
  for (const keyword of PERISHABILITY_KEYWORDS.low) {
    if (name.includes(keyword)) return "low"
  }
  return "medium"
}

/** 品目名を正規化する（前後空白の除去・全角空白の畳み込み） */
export function normalizeName(name: string): string {
  return name.replace(/\u3000/g, " ").trim()
}

/**
 * 生の在庫を、日持ち区分を付与した構造化在庫に正規化する。
 * 空の品目名は除外し、同名品目は先勝ちで重複排除する。
 */
export function normalizeInventory(raw: RawInventoryItem[]): InventoryItem[] {
  const seen = new Set<string>()
  const items: InventoryItem[] = []

  for (const entry of raw) {
    const name = normalizeName(entry.name)
    if (name === "") continue
    if (seen.has(name)) continue
    seen.add(name)

    const quantity =
      entry.quantity == null ? null : normalizeName(String(entry.quantity)) || null

    items.push({
      name,
      quantity,
      perishability: classifyPerishability(name),
    })
  }

  return items
}

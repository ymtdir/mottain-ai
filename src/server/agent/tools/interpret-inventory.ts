/**
 * 在庫解釈ツール（US1 / T019・FR-001・FR-002・FR-003）。
 *
 * ユーザーの発話から抽出した手持ち食材を、日持ち区分を付与した構造化在庫に整える。
 * 献立生成の前に呼び、解釈結果をユーザーに確認・修正してもらうために使う。
 */

import { tool } from "ai"
import { z } from "zod"
import { normalizeInventory } from "../../services/inventory"

const rawItemsSchema = z.object({
  items: z
    .array(
      z.object({
        name: z.string().describe("食材・調味料の品目名"),
        quantity: z
          .string()
          .nullable()
          .describe("概算数量。曖昧・不明なら null（例: 「少し」「3個」）"),
      }),
    )
    .describe("発話から読み取った手持ちの食材・調味料"),
})

export const interpretInventoryTool = tool({
  description:
    "ユーザーの発話から手持ちの食材・調味料を抽出し、構造化された在庫として整える。献立を作る前に呼び、解釈した在庫をユーザーに確認してもらう。",
  inputSchema: rawItemsSchema,
  execute: ({ items }) => {
    return { inventory: normalizeInventory(items) }
  },
})

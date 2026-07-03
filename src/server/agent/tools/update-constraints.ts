import { tool } from "ai"
import { z } from "zod"
import {
  upsertConstraints,
  addConstraint,
  removeConstraint,
} from "../../services/dietary-constraint"

const constraintItemSchema = z.object({
  name: z.string().describe("食材名"),
  aliases: z.array(z.string()).default([]).describe("別名・表記ゆれ"),
  type: z
    .enum(["allergy", "dislike"])
    .describe("allergy=アレルギー, dislike=苦手"),
})

const inputSchema = z.object({
  action: z
    .enum(["add", "remove", "replace"])
    .describe("add=追加, remove=削除, replace=全件置換"),
  items: z.array(constraintItemSchema).describe("操作対象の食材リスト"),
})

export const updateConstraintsTool = tool({
  description:
    "ユーザーのアレルギー・苦手食材を登録または更新する。これらはハード制約として以降の献立・買い物リストのいずれにも絶対に含めない。",
  inputSchema,
  execute: async ({ action, items }) => {
    if (action === "replace") {
      await upsertConstraints(items)
      return {
        success: true,
        message: `${items.length}件の回避食材を登録しました。`,
      }
    }
    if (action === "add") {
      for (const item of items) {
        await addConstraint(item)
      }
      return {
        success: true,
        message: `${items.length}件の回避食材を追加しました。`,
      }
    }
    // action === "remove"
    for (const item of items) {
      await removeConstraint(item.name)
    }
    return {
      success: true,
      message: `${items.length}件の回避食材を削除しました。`,
    }
  },
})

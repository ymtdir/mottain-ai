import { tool } from "ai"
import { z } from "zod"
import { registerRecipe } from "../../services/saved-recipe"

const inputSchema = z.object({
  title: z
    .string()
    .describe(
      "お気に入りに保存する料理名。会話中の献立からそのまま使う。「○日目」などの補足表記は含めない"
    ),
  ingredients: z
    .array(
      z.object({
        name: z.string().describe("食材名"),
        amount: z.string().nullable().describe("分量の目安。不明なら null"),
      })
    )
    .describe("材料。会話中の該当レシピからそのまま転記する（創作しない）"),
  steps: z
    .array(z.string())
    .describe("調理手順。会話中の該当レシピからそのまま転記する（創作しない）"),
  notes: z.string().nullable().describe("日持ち注意など。無ければ null"),
})

export const saveRecipeTool = tool({
  description:
    "指定された料理を『お気に入りレシピ』に保存する。ユーザーが「○○をお気に入りに保存して」などと指示したときに使う。味の好み・感想を記録する learnPreference とは別物。材料・手順は会話中の献立からそのまま転記し、見当たらない場合は創作せずユーザーに尋ねる。",
  inputSchema,
  execute: async ({ title, ingredients, steps, notes }) => {
    const recipe = await registerRecipe({ title, ingredients, steps, notes })
    // イラストは status=pending で保存され、お気に入りカードを開いた時点で
    // 生成が保証される（ADR-13）。ここでは発火しない。
    return {
      success: true,
      id: recipe.id,
      message: `「${recipe.content.title}」をお気に入りに保存しました。`,
    }
  },
})

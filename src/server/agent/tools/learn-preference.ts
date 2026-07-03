import { tool, generateObject } from "ai"
import { z } from "zod"
import { geminiFlash } from "../../model/gemini"
import {
  applyPreferenceFeedback,
  buildPreferenceContext,
} from "../../services/preference"

const extractedPreferenceSchema = z.object({
  globalTendencies: z
    .array(
      z.object({
        attribute: z
          .string()
          .describe(
            "味の属性キー（例: spiciness, saltiness, richness, flavor_depth）",
          ),
        adjustmentNote: z
          .string()
          .describe("具体的な調整内容（例: 辛さを抑える、塩分を控える）"),
      }),
    )
    .describe("全体的な傾向の調整。特定レシピに限らない感想から抽出する"),
  recipeAdjustments: z
    .array(
      z.object({
        recipeName: z.string().describe("対象のレシピ名"),
        adjustments: z
          .array(z.string())
          .describe("具体的な調整内容のリスト（例: 塩を半量に、にんにくを追加）"),
      }),
    )
    .describe("特定レシピへの調整。料理名が明示されている場合のみ抽出する"),
})

const inputSchema = z.object({
  feedback: z
    .string()
    .describe(
      "ユーザーが述べた好み・味の感想。例:「辛いのが苦手」「この生姜焼きはしょっぱかった」",
    ),
  recipeName: z
    .string()
    .nullable()
    .describe("感想の対象レシピ名。特定レシピへの感想でなければ null"),
})

export const learnPreferenceTool = tool({
  description:
    "ユーザーの好み・味の感想を解析し、具体的な調整として好みメモリに永続化する。抽象的な感想（「辛い」「しょっぱい」）を具体調整（「辛さを抑える」「塩分を控える」）に翻訳する。",
  inputSchema,
  execute: async ({ feedback, recipeName }) => {
    const now = new Date().toISOString()

    const contextHint = recipeName
      ? `ユーザーは「${recipeName}」について次の感想を述べました: ${feedback}`
      : `ユーザーは次の好み・感想を述べました: ${feedback}`

    const { object } = await generateObject({
      model: geminiFlash(),
      schema: extractedPreferenceSchema,
      prompt: `${contextHint}

この感想から、献立提案に反映すべき具体的な調整を抽出してください。
- 全体的な傾向（特定レシピに限らないもの）は globalTendencies に
- 特定レシピへの調整は recipeAdjustments に（料理名が明示されている場合のみ）
- 調整内容は「〜を抑える」「〜を追加する」など具体的な行動として記述する`,
    })

    const update = {
      globalTendencies: object.globalTendencies.map((t) => ({
        ...t,
        updatedAt: now,
      })),
      recipeAdjustments: object.recipeAdjustments.map((r) => ({
        ...r,
        updatedAt: now,
      })),
    }

    const merged = await applyPreferenceFeedback(update)
    const summary = buildPreferenceContext(merged)

    return {
      success: true,
      summary,
      message: "好みを記録しました。次回の献立提案に反映します。",
    }
  },
})

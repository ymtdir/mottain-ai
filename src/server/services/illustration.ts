import { generateText } from "ai"
import { geminiImage } from "../model/image-model"
import type { SavedRecipeContent } from "./saved-recipe"

export type GeneratedIllustration = { data: Buffer; mime: string }

/** レシピ内容から料理イラストの生成プロンプトを組み立てる */
export function buildIllustrationPrompt(content: SavedRecipeContent): string {
  return `料理「${content.title}」の完成写真風のイラスト。皿に美しく盛り付けられた一人前、明るく食欲をそそる色合い、やわらかな自然光、シンプルで清潔感のある背景。4:3 の横長構図。写実的だが温かみのあるタッチ。文字やロゴは入れない。`
}

/**
 * イラストを生成して画像バイトと MIME を返す（生成のみ・永続化はしない）。
 * 状態遷移・保存は saved-recipe.ts 側が担う（責務分離）。
 *
 * 画像生成は Gemini 画像モデル（`gemini-3.1-flash-image`）を用い、generateContent の
 * 画像モダリティ出力（`result.files`）から先頭の画像を取り出す。
 */
export async function generateIllustration(
  content: SavedRecipeContent
): Promise<GeneratedIllustration> {
  const { files } = await generateText({
    model: geminiImage(),
    prompt: buildIllustrationPrompt(content),
    providerOptions: {
      google: { responseModalities: ["TEXT", "IMAGE"] },
    },
    abortSignal: AbortSignal.timeout(90_000),
  })

  const image = files.find((f) => f.mediaType.startsWith("image/"))
  if (!image) {
    throw new Error(
      "画像が生成されませんでした（安全性フィルタ等で拒否された可能性）"
    )
  }

  return {
    data: Buffer.from(image.uint8Array),
    mime: image.mediaType,
  }
}

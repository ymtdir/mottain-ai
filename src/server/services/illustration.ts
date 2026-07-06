import { generateImage } from "ai"
import { imagen } from "../model/imagen"
import type { SavedRecipeContent } from "./saved-recipe"

export type GeneratedIllustration = { data: Buffer; mime: string }

/** レシピ内容から料理イラストの生成プロンプトを組み立てる */
export function buildIllustrationPrompt(content: SavedRecipeContent): string {
  return `料理「${content.title}」の完成写真風のイラスト。皿に美しく盛り付けられた一人前、明るく食欲をそそる色合い、やわらかな自然光、シンプルで清潔感のある背景。写実的だが温かみのあるタッチ。文字やロゴは入れない。`
}

/**
 * イラストを生成して画像バイトと MIME を返す（生成のみ・永続化はしない）。
 * 状態遷移・保存は saved-recipe.ts 側が担う（責務分離）。
 */
export async function generateIllustration(
  content: SavedRecipeContent
): Promise<GeneratedIllustration> {
  const { image } = await generateImage({
    model: imagen(),
    prompt: buildIllustrationPrompt(content),
    n: 1,
    aspectRatio: "4:3",
    abortSignal: AbortSignal.timeout(90_000),
  })
  return {
    data: Buffer.from(image.uint8Array),
    mime: image.mediaType,
  }
}

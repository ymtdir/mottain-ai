import { createVertex } from "@ai-sdk/google-vertex"

const vertex = createVertex({
  project: process.env.GOOGLE_CLOUD_PROJECT,
  location: process.env.GOOGLE_CLOUD_LOCATION ?? "asia-northeast1",
})

// 汎用チャット・エージェント推論用
export const geminiFlash = vertex("gemini-2.0-flash-001")

// 構造化出力・ツール呼び出し用（より高精度が必要な場合）
export const geminiPro = vertex("gemini-2.5-pro-preview-06-05")

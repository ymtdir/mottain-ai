import { createVertex } from "@ai-sdk/google-vertex"
import type { GoogleVertexProvider } from "@ai-sdk/google-vertex"
import type { LanguageModel } from "ai"

/**
 * 画像生成モデル（Gemini Enterprise Agent Platform / Vertex AI）のラッパ。
 *
 * 画像生成には Gemini 画像モデル `gemini-3.1-flash-image`（通称 Nano Banana 系）を用いる。
 * Imagen 4 系 API は 2026-06-24 に終了し、画像生成は Gemini API へ統合された。そのため
 * `generateText` の画像モダリティ出力（`responseModalities: ["TEXT","IMAGE"]`）で画像を得る。
 *
 * gemini.ts と同じ遅延生成パターン。モジュール import 時に認証情報を要求すると
 * 認証不要な単体テストまで壊れるため、実際に使う時点で解決する。
 *
 * このモデルは `global` ロケーションで提供されるため、画像用のロケーションを
 * 別 env（`GOOGLE_CLOUD_IMAGE_LOCATION`）で上書きできるようにする（既定 global）。
 */

let vertexProvider: GoogleVertexProvider | undefined

function getVertex(): GoogleVertexProvider {
  vertexProvider ??= createVertex({
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_IMAGE_LOCATION ?? "global",
  })
  return vertexProvider
}

export function geminiImage(): LanguageModel {
  return getVertex()("gemini-3.1-flash-image")
}

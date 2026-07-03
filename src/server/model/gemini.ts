import { createVertex } from "@ai-sdk/google-vertex"
import type { GoogleVertexProvider } from "@ai-sdk/google-vertex"
import type { LanguageModel } from "ai"

/**
 * Gemini（Gemini Enterprise Agent Platform / Vertex AI）プロバイダのラッパ。
 *
 * プロバイダ・モデルは遅延生成する。モジュール import 時に認証情報（GCP プロジェクト）を
 * 要求すると、認証不要な単体テストまで巻き込んで壊れるため、実際に使う時点で解決する。
 */

let vertexProvider: GoogleVertexProvider | undefined

function getVertex(): GoogleVertexProvider {
  vertexProvider ??= createVertex({
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_LOCATION ?? "us-central1",
  })
  return vertexProvider
}

/** 汎用チャット・エージェント推論用 */
export function geminiFlash(): LanguageModel {
  return getVertex()("gemini-2.0-flash-001")
}

/** 構造化出力・ツール呼び出し用（より高精度が必要な場合） */
export function geminiPro(): LanguageModel {
  return getVertex()("gemini-2.5-pro-preview-06-05")
}

import { createVertex } from "@ai-sdk/google-vertex"
import type { GoogleVertexProvider } from "@ai-sdk/google-vertex"
import type { ImageModel } from "ai"

/**
 * Imagen（Gemini Enterprise Agent Platform / Vertex AI）画像モデルのラッパ。
 *
 * gemini.ts と同じ遅延生成パターン。モジュール import 時に認証情報を要求すると
 * 認証不要な単体テストまで壊れるため、実際に使う時点で解決する。
 *
 * Imagen は Gemini とは対応リージョンが異なりうるため、画像用のロケーションを
 * 別 env（`GOOGLE_CLOUD_IMAGE_LOCATION`）で上書きできるようにする（既定 us-central1）。
 */

let vertexProvider: GoogleVertexProvider | undefined

function getVertex(): GoogleVertexProvider {
  vertexProvider ??= createVertex({
    project: process.env.GOOGLE_CLOUD_PROJECT,
    location: process.env.GOOGLE_CLOUD_IMAGE_LOCATION ?? "us-central1",
  })
  return vertexProvider
}

export function imagen(): ImageModel {
  return getVertex().image("imagen-3.0-generate-001")
}

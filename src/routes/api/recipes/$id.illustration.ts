import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import {
  ensureIllustration,
  getIllustration,
} from "../../../server/services/saved-recipe"

const uuidSchema = z.string().uuid()

export const Route = createFileRoute("/api/recipes/$id/illustration")({
  server: {
    handlers: {
      // 生成の発火・再試行（冪等）。生成はこのリクエスト内で実行する（ADR-13）
      POST: async ({ params }) => {
        if (!uuidSchema.safeParse(params.id).success)
          return Response.json({ error: "Invalid recipe id" }, { status: 400 })
        await ensureIllustration(params.id)
        return Response.json({ ok: true })
      },
      // 画像バイト配信（ready のときのみ。未 ready は 404）
      GET: async ({ params }) => {
        if (!uuidSchema.safeParse(params.id).success)
          return Response.json({ error: "Invalid recipe id" }, { status: 400 })
        const img = await getIllustration(params.id)
        if (!img) return new Response(null, { status: 404 })
        return new Response(new Uint8Array(img.data), {
          headers: {
            "Content-Type": img.mime,
            "Cache-Control": "public, max-age=31536000, immutable",
          },
        })
      },
    },
  },
})

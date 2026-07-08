import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { generateText } from "ai"
import { geminiFlash } from "../../../server/model/gemini"
import { renameSession } from "../../../server/services/chat-session"

const uuidSchema = z.uuid()
const postBodySchema = z.object({ firstMessage: z.string().min(1).max(500) })

export const Route = createFileRoute("/api/sessions/$sessionId/generate-title")(
  {
    server: {
      handlers: {
        POST: async ({ request, params }) => {
          if (!uuidSchema.safeParse(params.sessionId).success)
            return Response.json(
              { error: "Invalid session id" },
              { status: 400 }
            )

          let body: unknown
          try {
            body = await request.json()
          } catch {
            return Response.json({ error: "Invalid JSON" }, { status: 400 })
          }
          const parsed = postBodySchema.safeParse(body)
          if (!parsed.success)
            return Response.json({ error: "Invalid request" }, { status: 400 })

          const { text } = await generateText({
            model: geminiFlash(),
            prompt: `次のメッセージを20文字以内の日本語タイトルにしてください。記号・カギカッコ不要。タイトルのみ出力してください。\n\n${parsed.data.firstMessage}`,
          })

          const title = text.trim().slice(0, 20)
          if (!title) return Response.json({ title: "" })
          await renameSession(params.sessionId, title)
          return Response.json({ title })
        },
      },
    },
  }
)

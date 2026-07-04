import { createFileRoute } from "@tanstack/react-router"
import type { UIMessage } from "ai"
import {
  renameSession,
  deleteSession,
  getMessages,
  saveMessages,
} from "../../../server/services/chat-session"

export const Route = createFileRoute("/api/sessions/$sessionId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const messages = await getMessages(params.sessionId)
        return Response.json(messages)
      },
      POST: async ({ request, params }) => {
        const { messages } = (await request.json()) as {
          messages: UIMessage[]
        }
        await saveMessages(params.sessionId, messages)
        return Response.json({ ok: true })
      },
      PATCH: async ({ request, params }) => {
        const { name } = (await request.json()) as { name: string }
        await renameSession(params.sessionId, name)
        return Response.json({ ok: true })
      },
      DELETE: async ({ params }) => {
        await deleteSession(params.sessionId)
        return Response.json({ ok: true })
      },
    },
  },
})

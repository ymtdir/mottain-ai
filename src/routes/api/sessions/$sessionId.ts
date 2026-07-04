import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import {
  renameSession,
  deleteSession,
  getMessages,
  saveMessages,
} from "../../../server/services/chat-session"

const uuidSchema = z.string().uuid()

const postBodySchema = z.object({
  messages: z.array(
    z.object({
      id: z.string(),
      role: z.enum(["user", "assistant", "system", "tool"]),
      parts: z.array(z.unknown()),
    })
  ),
})

const patchBodySchema = z.object({ name: z.string().min(1) })

export const Route = createFileRoute("/api/sessions/$sessionId")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        if (!uuidSchema.safeParse(params.sessionId).success)
          return Response.json({ error: "Invalid session id" }, { status: 400 })
        const messages = await getMessages(params.sessionId)
        return Response.json(messages)
      },
      POST: async ({ request, params }) => {
        if (!uuidSchema.safeParse(params.sessionId).success)
          return Response.json({ error: "Invalid session id" }, { status: 400 })
        const parsed = postBodySchema.safeParse(await request.json())
        if (!parsed.success)
          return Response.json({ error: "Invalid request" }, { status: 400 })
        await saveMessages(
          params.sessionId,
          parsed.data.messages as Parameters<typeof saveMessages>[1]
        )
        return Response.json({ ok: true })
      },
      PATCH: async ({ request, params }) => {
        if (!uuidSchema.safeParse(params.sessionId).success)
          return Response.json({ error: "Invalid session id" }, { status: 400 })
        const parsed = patchBodySchema.safeParse(await request.json())
        if (!parsed.success)
          return Response.json({ error: "Invalid request" }, { status: 400 })
        await renameSession(params.sessionId, parsed.data.name)
        return Response.json({ ok: true })
      },
      DELETE: async ({ params }) => {
        if (!uuidSchema.safeParse(params.sessionId).success)
          return Response.json({ error: "Invalid session id" }, { status: 400 })
        await deleteSession(params.sessionId)
        return Response.json({ ok: true })
      },
    },
  },
})

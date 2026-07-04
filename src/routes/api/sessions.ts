import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { listSessions, createSession } from "../../server/services/chat-session"

const postBodySchema = z.object({ name: z.string().optional() })

export const Route = createFileRoute("/api/sessions")({
  server: {
    handlers: {
      GET: async () => {
        const sessions = await listSessions()
        return Response.json(sessions)
      },
      POST: async ({ request }) => {
        const parsed = postBodySchema.safeParse(await request.json())
        if (!parsed.success)
          return Response.json({ error: "Invalid request" }, { status: 400 })
        const session = await createSession(parsed.data.name)
        return Response.json(session)
      },
    },
  },
})

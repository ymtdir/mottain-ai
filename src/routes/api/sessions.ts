import { createFileRoute } from "@tanstack/react-router"
import { listSessions, createSession } from "../../server/services/chat-session"

export const Route = createFileRoute("/api/sessions")({
  server: {
    handlers: {
      GET: async () => {
        const sessions = await listSessions()
        return Response.json(sessions)
      },
      POST: async ({ request }) => {
        const body = (await request.json()) as { name?: string }
        const session = await createSession(body.name)
        return Response.json(session)
      },
    },
  },
})

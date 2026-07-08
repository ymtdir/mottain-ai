import { createFileRoute } from "@tanstack/react-router"
import {
  getSessionToken,
  verifySessionToken,
} from "../../../server/services/auth"

export const Route = createFileRoute("/api/auth/me")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const cookie = request.headers.get("cookie")
        const token = getSessionToken(cookie)
        if (!token || !verifySessionToken(token))
          return Response.json({ error: "Unauthorized" }, { status: 401 })
        return Response.json({
          email: process.env.DEMO_EMAIL ?? "",
          name: process.env.DEMO_NAME ?? "",
        })
      },
    },
  },
})

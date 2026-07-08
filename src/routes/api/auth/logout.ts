import { createFileRoute } from "@tanstack/react-router"
import { makeClearCookieHeader } from "../../../server/services/auth"

export const Route = createFileRoute("/api/auth/logout")({
  server: {
    handlers: {
      POST: async () => {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": makeClearCookieHeader(),
          },
        })
      },
    },
  },
})

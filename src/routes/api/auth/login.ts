import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import {
  verifyCredentials,
  createSessionToken,
  makeSetCookieHeader,
} from "../../../server/services/auth"

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

export const Route = createFileRoute("/api/auth/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const parsed = bodySchema.safeParse(await request.json())
        if (!parsed.success)
          return Response.json({ error: "Invalid request" }, { status: 400 })

        const { email, password } = parsed.data
        if (!verifyCredentials(email, password))
          return Response.json(
            { error: "メールアドレスまたはパスワードが正しくありません" },
            { status: 401 }
          )

        const token = createSessionToken()
        return new Response(JSON.stringify({ ok: true }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Set-Cookie": makeSetCookieHeader(token),
          },
        })
      },
    },
  },
})

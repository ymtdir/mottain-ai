import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import {
  getConstraints,
  addConstraint,
  removeConstraint,
} from "../../server/services/dietary-constraint"

const avoidanceItemSchema = z.object({
  name: z.string().min(1),
  aliases: z.array(z.string()),
})

const postBodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add"), item: avoidanceItemSchema }),
  z.object({ action: z.literal("remove"), name: z.string().min(1) }),
])

export const Route = createFileRoute("/api/constraints")({
  server: {
    handlers: {
      GET: async () => {
        const items = await getConstraints()
        return Response.json(items)
      },
      POST: async ({ request }) => {
        const parsed = postBodySchema.safeParse(await request.json())
        if (!parsed.success)
          return Response.json({ error: "Invalid request" }, { status: 400 })
        const body = parsed.data
        if (body.action === "add") {
          await addConstraint(body.item)
        } else {
          await removeConstraint(body.name)
        }
        return Response.json({ ok: true })
      },
    },
  },
})

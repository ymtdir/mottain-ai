import { createFileRoute } from "@tanstack/react-router"
import {
  getConstraints,
  addConstraint,
  removeConstraint,
} from "../../server/services/dietary-constraint"
import type { AvoidanceItem } from "../../server/services/dietary-constraint"

export const Route = createFileRoute("/api/constraints")({
  server: {
    handlers: {
      GET: async () => {
        const items = await getConstraints()
        return Response.json(items)
      },
      POST: async ({ request }) => {
        const { action, item, name } = (await request.json()) as {
          action: "add" | "remove"
          item?: AvoidanceItem
          name?: string
        }
        if (action === "add" && item) {
          await addConstraint(item)
        } else if (action === "remove" && name) {
          await removeConstraint(name)
        }
        return Response.json({ ok: true })
      },
    },
  },
})

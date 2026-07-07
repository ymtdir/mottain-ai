import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { deleteMealLog } from "../../../server/services/meal-log"

const uuidSchema = z.uuid()

export const Route = createFileRoute("/api/meals/$id")({
  server: {
    handlers: {
      DELETE: async ({ params }) => {
        if (!uuidSchema.safeParse(params.id).success)
          return Response.json(
            { error: "Invalid meal log id" },
            { status: 400 }
          )
        await deleteMealLog(params.id)
        return new Response(null, { status: 204 })
      },
    },
  },
})

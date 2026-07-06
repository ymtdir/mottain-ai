import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { deleteRecipe } from "../../../server/services/saved-recipe"

const uuidSchema = z.uuid()

export const Route = createFileRoute("/api/recipes/$id")({
  server: {
    handlers: {
      DELETE: async ({ params }) => {
        if (!uuidSchema.safeParse(params.id).success)
          return Response.json({ error: "Invalid recipe id" }, { status: 400 })
        await deleteRecipe(params.id)
        return new Response(null, { status: 204 })
      },
    },
  },
})

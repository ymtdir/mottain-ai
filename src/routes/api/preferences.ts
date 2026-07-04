import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import {
  getPreference,
  upsertPreference,
} from "../../server/services/preference"

const postBodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("add-tendency"), note: z.string().min(1) }),
  z.object({
    action: z.literal("remove-tendency"),
    attribute: z.string().min(1),
  }),
  z.object({
    action: z.literal("remove-recipe"),
    recipeName: z.string().min(1),
  }),
])

export const Route = createFileRoute("/api/preferences")({
  server: {
    handlers: {
      GET: async () => {
        const pref = await getPreference()
        return Response.json(pref)
      },
      POST: async ({ request }) => {
        const parsed = postBodySchema.safeParse(await request.json())
        if (!parsed.success)
          return Response.json({ error: "Invalid request" }, { status: 400 })
        const body = parsed.data
        const existing = await getPreference()

        if (body.action === "add-tendency") {
          const note = body.note.trim()
          const newTendency = {
            attribute: note,
            adjustmentNote: note,
            updatedAt: new Date().toISOString(),
          }
          const tendencies = [
            ...existing.globalTendencies.filter((t) => t.attribute !== note),
            newTendency,
          ]
          await upsertPreference({ ...existing, globalTendencies: tendencies })
        } else if (body.action === "remove-tendency") {
          await upsertPreference({
            ...existing,
            globalTendencies: existing.globalTendencies.filter(
              (t) => t.attribute !== body.attribute
            ),
          })
        } else if (body.action === "remove-recipe") {
          await upsertPreference({
            ...existing,
            recipeAdjustments: existing.recipeAdjustments.filter(
              (r) => r.recipeName !== body.recipeName
            ),
          })
        }

        return Response.json({ ok: true })
      },
    },
  },
})

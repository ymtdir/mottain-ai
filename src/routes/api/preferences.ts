import { createFileRoute } from "@tanstack/react-router"
import {
  getPreference,
  upsertPreference,
} from "../../server/services/preference"

export const Route = createFileRoute("/api/preferences")({
  server: {
    handlers: {
      GET: async () => {
        const pref = await getPreference()
        return Response.json(pref)
      },
      POST: async ({ request }) => {
        const body = (await request.json()) as {
          action: "add-tendency" | "remove-tendency" | "remove-recipe"
          note?: string
          attribute?: string
          recipeName?: string
        }
        const existing = await getPreference()

        if (body.action === "add-tendency" && body.note) {
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
        } else if (body.action === "remove-tendency" && body.attribute) {
          await upsertPreference({
            ...existing,
            globalTendencies: existing.globalTendencies.filter(
              (t) => t.attribute !== body.attribute
            ),
          })
        } else if (body.action === "remove-recipe" && body.recipeName) {
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

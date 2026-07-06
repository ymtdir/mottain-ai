import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import {
  listSavedRecipes,
  registerRecipe,
} from "../../server/services/saved-recipe"

const ingredientSchema = z.object({
  name: z.string().min(1),
  amount: z.string().nullable(),
})

const contentSchema = z.object({
  title: z.string().min(1),
  ingredients: z.array(ingredientSchema),
  steps: z.array(z.string()),
  notes: z.string().nullable(),
})

const postBodySchema = z.object({ content: contentSchema })

export const Route = createFileRoute("/api/recipes")({
  server: {
    handlers: {
      GET: async () => {
        const recipes = await listSavedRecipes()
        return Response.json(recipes)
      },
      POST: async ({ request }) => {
        const parsed = postBodySchema.safeParse(await request.json())
        if (!parsed.success)
          return Response.json({ error: "Invalid request" }, { status: 400 })
        try {
          const recipe = await registerRecipe(parsed.data.content)
          return Response.json(recipe)
        } catch (e) {
          const msg = e instanceof Error ? e.message : "登録に失敗しました"
          return Response.json({ error: msg }, { status: 422 })
        }
      },
    },
  },
})

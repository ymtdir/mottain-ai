import { createFileRoute } from "@tanstack/react-router"
import { z } from "zod"
import { generateText, stepCountIs } from "ai"
import { geminiFlash } from "@/server/model/gemini"
import { learnPreferenceTool } from "@/server/agent/tools/learn-preference"

const bodySchema = z.object({
  dishTitle: z.string().min(1).max(100),
  eatenOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  comment: z.string().min(1).max(500),
})

export const Route = createFileRoute("/api/meals/comment")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: unknown
        try {
          body = await request.json()
        } catch {
          return Response.json({ error: "入力が不正です" }, { status: 400 })
        }
        const parsed = bodySchema.safeParse(body)
        if (!parsed.success)
          return Response.json({ error: "入力が不正です" }, { status: 400 })
        const { dishTitle, eatenOn, comment } = parsed.data
        await generateText({
          model: geminiFlash(),
          messages: [
            {
              role: "user",
              content: `${eatenOn}に食べた料理「${dishTitle}」についてのコメント:「${comment}」\nこのコメントから食の好みや調整点があれば learnPreference ツールで記録してください。記録できる点がなければ何もしなくてよいです。`,
            },
          ],
          tools: { learnPreference: learnPreferenceTool },
          stopWhen: stepCountIs(3),
        })
        return Response.json({ message: "AIに送りました。" })
      },
    },
  },
})

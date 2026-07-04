import { createFileRoute } from "@tanstack/react-router"
import { convertToModelMessages } from "ai"
import type { UIMessage } from "ai"
import { runAgent } from "../../server/agent/agent"

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const { messages } = (await request.json()) as {
          messages: UIMessage[]
        }
        const result = await runAgent(await convertToModelMessages(messages))
        return result.toUIMessageStreamResponse()
      },
    },
  },
})

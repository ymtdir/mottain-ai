import { createAPIFileRoute } from "@tanstack/react-start/api"
import { convertToModelMessages } from "ai"
import type { UIMessage } from "ai"
import { runAgent } from "../../server/agent/agent"

export const APIRoute = createAPIFileRoute("/api/chat")({
  POST: async ({ request }) => {
    const { messages } = (await request.json()) as { messages: UIMessage[] }
    const result = await runAgent(await convertToModelMessages(messages))
    return result.toUIMessageStreamResponse()
  },
})

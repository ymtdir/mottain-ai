import { createFileRoute } from "@tanstack/react-router"
import { listMealLogs } from "../../server/services/meal-log"

export const Route = createFileRoute("/api/meals")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url)
        const month = url.searchParams.get("month")
        if (!month || !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
          return Response.json(
            { error: "month パラメータが不正です（例: 2026-07）" },
            { status: 400 }
          )
        }
        const logs = await listMealLogs(month)
        return Response.json(logs)
      },
    },
  },
})

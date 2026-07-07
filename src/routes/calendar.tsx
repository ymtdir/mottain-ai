import { createFileRoute } from "@tanstack/react-router"
import { useState, useEffect, useCallback } from "react"
import { CalendarDays } from "lucide-react"
import { toast } from "sonner"
import { MonthCalendar } from "@/components/calendar/MonthCalendar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { SessionSidebar } from "@/components/chat/SessionSidebar"
import type { MealLog } from "@/server/services/meal-log"
import type { ChatSession } from "@/server/services/chat-session"
import type { AvoidanceItem } from "@/server/services/avoidance-guard"
import type { PreferenceMemory } from "@/server/services/preference"

export const Route = createFileRoute("/calendar")({ component: CalendarPage })

function toYearMonth(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
}

function CalendarPage() {
  const [month, setMonth] = useState(() =>
    toYearMonth(
      new Date(new Date().toLocaleString("en-US", { timeZone: "Asia/Tokyo" }))
    )
  )
  const [logs, setLogs] = useState<MealLog[]>([])
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [constraints, setConstraints] = useState<AvoidanceItem[]>([])
  const [preferences, setPreferences] = useState<PreferenceMemory>({
    globalTendencies: [],
    recipeAdjustments: [],
  })

  const loadLogs = useCallback((m: string) => {
    fetch(`/api/meals?month=${m}`)
      .then((r) => r.json())
      .then((data: MealLog[]) => setLogs(data))
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadLogs(month)
  }, [loadLogs, month])

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then(setSessions)
      .catch(() => {})
    fetch("/api/constraints")
      .then((r) => r.json())
      .then(setConstraints)
      .catch(() => {})
    fetch("/api/preferences")
      .then((r) => r.json())
      .then(setPreferences)
      .catch(() => {})
  }, [])

  function prevMonth() {
    const [y, m] = month.split("-").map(Number)
    const d = new Date(y, m - 2, 1)
    setMonth(toYearMonth(d))
  }

  function nextMonth() {
    const [y, m] = month.split("-").map(Number)
    const d = new Date(y, m, 1)
    setMonth(toYearMonth(d))
  }

  async function handleDeleteLog(id: string) {
    const res = await fetch(`/api/meals/${id}`, { method: "DELETE" }).catch(
      () => null
    )
    if (res?.ok) {
      setLogs((prev) => prev.filter((l) => l.id !== id))
    } else {
      toast.error("削除に失敗しました。もう一度お試しください。")
    }
  }

  return (
    <SidebarProvider>
      <SessionSidebar
        sessions={sessions}
        activeId={null}
        onSelect={() => {
          window.location.href = "/"
        }}
        onCreate={async () => {
          window.location.href = "/"
        }}
        onRename={async () => {}}
        onDelete={async () => {}}
        constraints={constraints}
        onAddConstraint={async (item: AvoidanceItem) => {
          await fetch("/api/constraints", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "add", item }),
          })
          setConstraints((prev) => [
            ...prev.filter((c) => c.name !== item.name),
            item,
          ])
        }}
        onRemoveConstraint={async (name: string) => {
          await fetch("/api/constraints", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ action: "remove", name }),
          })
          setConstraints((prev) => prev.filter((c) => c.name !== name))
        }}
        preferences={preferences}
        onAddTendency={async () => {}}
        onRemoveTendency={async () => {}}
        onRemoveRecipe={async () => {}}
        onNavigateFavorites={() => {
          window.location.href = "/"
        }}
        onNavigateCalendar={() => {}}
      />
      <SidebarInset className="flex h-svh flex-col">
        <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 px-6 py-4 backdrop-blur">
          <CalendarDays size={20} className="text-primary" />
          <h1 className="text-base font-semibold">食事カレンダー</h1>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <MonthCalendar
            month={month}
            logs={logs}
            onPrevMonth={prevMonth}
            onNextMonth={nextMonth}
            onDeleteLog={handleDeleteLog}
            onSaveRecipe={() => {}}
          />
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}

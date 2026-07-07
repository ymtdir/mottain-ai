import { createFileRoute } from "@tanstack/react-router"
import { useChat } from "@ai-sdk/react"
import { toast } from "sonner"
import { useState, useEffect, useCallback, useRef } from "react"
import type { FormEvent } from "react"
import type { UIMessage } from "ai"
import { ChatInput } from "@/components/chat/ChatInput"
import { MessageList } from "@/components/chat/MessageList"
import { SessionSidebar } from "@/components/chat/SessionSidebar"
import { AppHeader } from "@/components/layout/AppHeader"
import type { AppTab } from "@/components/layout/AppHeader"
import { SavedRecipesView } from "@/components/recipe/SavedRecipesView"
import { MonthCalendar } from "@/components/calendar/MonthCalendar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { todayInTokyo, toYearMonth } from "@/lib/date"
import type { ChatSession } from "@/server/services/chat-session"
import type { AvoidanceItem } from "@/server/services/avoidance-guard"
import type { PreferenceMemory } from "@/server/services/preference"
import type { SavedRecipeListItem } from "@/server/services/saved-recipe"
import type { MealLog } from "@/server/services/meal-log"

type View = AppTab

export const Route = createFileRoute("/")({
  component: ChatPage,
  validateSearch: (search: Record<string, unknown>): { view?: View } => {
    const v = search.view
    if (v === "favorites" || v === "calendar") return { view: v }
    return {}
  },
})

function ChatPage() {
  const { view: viewParam } = Route.useSearch()
  const [view, setView] = useState<View>(viewParam ?? "chat")

  useEffect(() => {
    if (viewParam) setView(viewParam)
  }, [viewParam])
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [constraints, setConstraints] = useState<AvoidanceItem[]>([])
  const [preferences, setPreferences] = useState<PreferenceMemory>({
    globalTendencies: [],
    recipeAdjustments: [],
  })
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipeListItem[]>([])
  const [mealMonth, setMealMonth] = useState(() => toYearMonth(todayInTokyo()))
  const [mealLogs, setMealLogs] = useState<MealLog[]>([])
  const [input, setInput] = useState("")
  const pendingSave = useRef(false)
  const loadingSessionId = useRef<string | null>(null)

  const loadPreferences = useCallback(() => {
    fetch("/api/preferences")
      .then((r) => r.json())
      .then(setPreferences)
      .catch(() => {})
  }, [])

  const loadConstraints = useCallback(() => {
    fetch("/api/constraints")
      .then((r) => r.json())
      .then(setConstraints)
      .catch(() => {})
  }, [])

  const { messages, setMessages, sendMessage, status } = useChat({
    onFinish: () => {
      pendingSave.current = true
      loadPreferences()
      loadConstraints()
    },
  })
  const isLoading = status === "submitted" || status === "streaming"

  useEffect(() => {
    fetch("/api/sessions")
      .then((r) => r.json())
      .then((data: ChatSession[]) => {
        setSessions(data)
        if (data.length > 0) loadSession(data[0].id)
      })
      .catch(() => {})
  }, [])

  useEffect(() => {
    loadConstraints()
  }, [loadConstraints])

  const loadSavedRecipes = useCallback(() => {
    fetch("/api/recipes")
      .then((r) => r.json())
      .then((data: SavedRecipeListItem[]) => setSavedRecipes(data))
      .catch(() => {})
  }, [])

  const loadMealLogs = useCallback((m: string, signal?: AbortSignal) => {
    fetch(`/api/meals?month=${m}`, { signal })
      .then((r) => r.json())
      .then((data: MealLog[]) => setMealLogs(data))
      .catch(() => {})
  }, [])

  // カレンダー表示中のみ、月の変更に追従して記録を取得する
  useEffect(() => {
    if (view !== "calendar") return
    const controller = new AbortController()
    loadMealLogs(mealMonth, controller.signal)
    return () => controller.abort()
  }, [view, mealMonth, loadMealLogs])

  function prevMonth() {
    const [y, m] = mealMonth.split("-").map(Number)
    const pm = m === 1 ? 12 : m - 1
    const py = m === 1 ? y - 1 : y
    setMealMonth(`${py}-${String(pm).padStart(2, "0")}`)
  }

  function nextMonth() {
    const [y, m] = mealMonth.split("-").map(Number)
    const nm = m === 12 ? 1 : m + 1
    const ny = m === 12 ? y + 1 : y
    setMealMonth(`${ny}-${String(nm).padStart(2, "0")}`)
  }

  const handleDeleteMealLog = useCallback(async (id: string) => {
    const res = await fetch(`/api/meals/${id}`, { method: "DELETE" }).catch(
      () => null
    )
    if (res?.ok) {
      setMealLogs((prev) => prev.filter((l) => l.id !== id))
    } else {
      toast.error("削除に失敗しました。もう一度お試しください。")
    }
  }, [])

  const handleDeleteSavedRecipe = useCallback(async (id: string) => {
    const res = await fetch(`/api/recipes/${id}`, { method: "DELETE" }).catch(
      () => null
    )
    if (res?.ok) {
      setSavedRecipes((prev) => prev.filter((r) => r.id !== id))
    } else {
      toast.error("削除に失敗しました。もう一度お試しください。")
    }
  }, [])

  useEffect(() => {
    loadSavedRecipes()
  }, [loadSavedRecipes])

  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  useEffect(() => {
    if (pendingSave.current && !isLoading && activeId && messages.length > 0) {
      fetch(`/api/sessions/${activeId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages }),
      })
        .then(() => {
          pendingSave.current = false
        })
        .catch(() => {})
    }
  }, [isLoading, activeId, messages])

  function loadSession(id: string) {
    setActiveId(id)
    loadingSessionId.current = id
    fetch(`/api/sessions/${id}`)
      .then((r) => r.json())
      .then((msgs: UIMessage[]) => {
        if (loadingSessionId.current === id) setMessages(msgs)
      })
      .catch(() => {})
  }

  async function handleCreate() {
    const res = await fetch("/api/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
    const session: ChatSession = await res.json()
    setSessions((prev) => [session, ...prev])
    setActiveId(session.id)
    setMessages([])
    setView("chat")
  }

  async function handleRename(id: string, name: string) {
    await fetch(`/api/sessions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    })
    setSessions((prev) => prev.map((s) => (s.id === id ? { ...s, name } : s)))
  }

  async function handleDelete(id: string) {
    await fetch(`/api/sessions/${id}`, { method: "DELETE" })
    setSessions((prev) => prev.filter((s) => s.id !== id))
    if (activeId === id) {
      const remaining = sessions.filter((s) => s.id !== id)
      if (remaining.length > 0) loadSession(remaining[0].id)
      else {
        setActiveId(null)
        setMessages([])
      }
    }
  }

  const handleAddConstraint = useCallback(async (item: AvoidanceItem) => {
    await fetch("/api/constraints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", item }),
    })
    setConstraints((prev) => [
      ...prev.filter((c) => c.name !== item.name),
      item,
    ])
  }, [])

  const handleRemoveConstraint = useCallback(async (name: string) => {
    await fetch("/api/constraints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", name }),
    })
    setConstraints((prev) => prev.filter((c) => c.name !== name))
  }, [])

  const handleAddTendency = useCallback(async (note: string) => {
    await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add-tendency", note }),
    })
    setPreferences((prev) => ({
      ...prev,
      globalTendencies: [
        ...prev.globalTendencies.filter((t) => t.attribute !== note),
        {
          attribute: note,
          adjustmentNote: note,
          updatedAt: new Date().toISOString(),
        },
      ],
    }))
  }, [])

  const handleRemoveTendency = useCallback(async (attribute: string) => {
    await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove-tendency", attribute }),
    })
    setPreferences((prev) => ({
      ...prev,
      globalTendencies: prev.globalTendencies.filter(
        (t) => t.attribute !== attribute
      ),
    }))
  }, [])

  const handleRemoveRecipe = useCallback(async (recipeName: string) => {
    await fetch("/api/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove-recipe", recipeName }),
    })
    setPreferences((prev) => ({
      ...prev,
      recipeAdjustments: prev.recipeAdjustments.filter(
        (r) => r.recipeName !== recipeName
      ),
    }))
  }, [])

  const handleCommentFromCalendar = useCallback(
    async (
      log: import("@/server/services/meal-log").MealLog,
      comment: string
    ) => {
      let sid = activeId
      if (!sid) {
        const res = await fetch("/api/sessions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        })
        const session: ChatSession = await res.json()
        setSessions((prev) => [session, ...prev])
        setActiveId(session.id)
        sid = session.id
      }
      setView("chat")
      const text = `${log.eatenOn}に記録した「${log.content.title}」について: ${comment}`
      await sendMessage({ text })
    },
    [activeId, sendMessage]
  )

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    let sid = activeId
    if (!sid) {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      })
      const session: ChatSession = await res.json()
      setSessions((prev) => [session, ...prev])
      setActiveId(session.id)
      sid = session.id
    }

    const text = input.trim()
    setInput("")
    await sendMessage({ text })
  }

  return (
    <SidebarProvider>
      <SessionSidebar
        sessions={sessions}
        activeId={activeId}
        onSelect={(id) => {
          loadSession(id)
          setView("chat")
        }}
        onCreate={handleCreate}
        onRename={handleRename}
        onDelete={handleDelete}
        constraints={constraints}
        onAddConstraint={handleAddConstraint}
        onRemoveConstraint={handleRemoveConstraint}
        preferences={preferences}
        onAddTendency={handleAddTendency}
        onRemoveTendency={handleRemoveTendency}
        onRemoveRecipe={handleRemoveRecipe}
      />
      <SidebarInset className="flex h-svh flex-col">
        <AppHeader
          current={view}
          onSelectChat={() => setView("chat")}
          onSelectCalendar={() => setView("calendar")}
          onSelectFavorites={() => {
            loadSavedRecipes()
            setView("favorites")
          }}
        />
        {view === "favorites" ? (
          <main className="flex-1 overflow-y-auto p-6">
            <SavedRecipesView
              recipes={savedRecipes}
              onRefresh={loadSavedRecipes}
              onDeleteRecipe={handleDeleteSavedRecipe}
            />
          </main>
        ) : view === "calendar" ? (
          <main className="flex-1 overflow-y-auto p-6">
            <MonthCalendar
              month={mealMonth}
              logs={mealLogs}
              onPrevMonth={prevMonth}
              onNextMonth={nextMonth}
              onDeleteLog={handleDeleteMealLog}
              onSaveRecipe={() => loadSavedRecipes()}
              onComment={handleCommentFromCalendar}
            />
          </main>
        ) : (
          <>
            <MessageList messages={messages} status={status} />
            <ChatInput
              input={input}
              isLoading={isLoading}
              onInputChange={setInput}
              onSubmit={handleSubmit}
            />
          </>
        )}
      </SidebarInset>
    </SidebarProvider>
  )
}

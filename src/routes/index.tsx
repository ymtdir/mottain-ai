import { createFileRoute } from "@tanstack/react-router"
import { useChat } from "@ai-sdk/react"
import { toast } from "sonner"
import { useState, useEffect, useCallback, useRef, useMemo } from "react"
import type { FormEvent } from "react"
import type { UIMessage } from "ai"
import { ChatInput } from "@/components/chat/ChatInput"
import { MessageList } from "@/components/chat/MessageList"
import { SessionSidebar } from "@/components/chat/SessionSidebar"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import type { ChatSession } from "@/server/services/chat-session"
import type { AvoidanceItem } from "@/server/services/avoidance-guard"
import type { PreferenceMemory } from "@/server/services/preference"
import type { SavedRecipeListItem } from "@/server/services/saved-recipe"

export const Route = createFileRoute("/")({ component: ChatPage })

function ChatPage() {
  const [sessions, setSessions] = useState<ChatSession[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [constraints, setConstraints] = useState<AvoidanceItem[]>([])
  const [preferences, setPreferences] = useState<PreferenceMemory>({
    globalTendencies: [],
    recipeAdjustments: [],
  })
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipeListItem[]>([])
  const [input, setInput] = useState("")
  const pendingSave = useRef(false)
  const loadingSessionId = useRef<string | null>(null)

  const loadPreferences = useCallback(() => {
    fetch("/api/preferences")
      .then((r) => r.json())
      .then(setPreferences)
      .catch(() => {})
  }, [])

  const { messages, setMessages, sendMessage, status } = useChat({
    onFinish: () => {
      pendingSave.current = true
      loadPreferences()
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
    fetch("/api/constraints")
      .then((r) => r.json())
      .then(setConstraints)
      .catch(() => {})
  }, [])

  const loadSavedRecipes = useCallback(() => {
    fetch("/api/recipes")
      .then((r) => r.json())
      .then((data: SavedRecipeListItem[]) => setSavedRecipes(data))
      .catch(() => {})
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

  const savedTitles = useMemo(
    () => new Set(savedRecipes.map((r) => r.normalizedTitle)),
    [savedRecipes]
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
        onSelect={loadSession}
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
        savedRecipes={savedRecipes}
        onRefreshSavedRecipes={loadSavedRecipes}
        onDeleteSavedRecipe={handleDeleteSavedRecipe}
      />
      <SidebarInset className="flex h-svh flex-col">
        <MessageList
          messages={messages}
          status={status}
          savedTitles={savedTitles}
        />
        <ChatInput
          input={input}
          isLoading={isLoading}
          onInputChange={setInput}
          onSubmit={handleSubmit}
        />
      </SidebarInset>
    </SidebarProvider>
  )
}

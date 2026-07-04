import { createFileRoute } from "@tanstack/react-router"
import { useChat } from "@ai-sdk/react"
import { useState, useEffect } from "react"
import type { FormEvent } from "react"
import { Settings } from "lucide-react"
import { ChatInput } from "@/components/chat/ChatInput"
import { MessageList } from "@/components/chat/MessageList"
import { ConstraintsPanel } from "@/components/settings/ConstraintsPanel"
import type { AvoidanceItem } from "@/server/services/dietary-constraint"

export const Route = createFileRoute("/")({ component: ChatPage })

function ChatPage() {
  const { messages, sendMessage, status } = useChat()
  const [input, setInput] = useState("")
  const isLoading = status === "submitted" || status === "streaming"

  const [settingsOpen, setSettingsOpen] = useState(false)
  const [constraints, setConstraints] = useState<AvoidanceItem[]>([])

  useEffect(() => {
    fetch("/api/constraints")
      .then((r) => r.json())
      .then(setConstraints)
      .catch(() => {})
  }, [])

  async function handleAdd(item: AvoidanceItem) {
    await fetch("/api/constraints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "add", item }),
    })
    setConstraints((prev) => {
      const deduped = prev.filter((c) => c.name !== item.name)
      return [...deduped, item]
    })
  }

  async function handleRemove(name: string) {
    await fetch("/api/constraints", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "remove", name }),
    })
    setConstraints((prev) => prev.filter((c) => c.name !== name))
  }

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const text = input.trim()
    setInput("")
    await sendMessage({ text })
  }

  return (
    <div className="flex h-svh flex-col">
      <header className="flex items-center justify-between border-b px-4 py-3">
        <h1 className="font-[family-name:var(--font-display)] text-xl font-bold tracking-wide text-primary">
          MottainAI
        </h1>
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
          aria-label="設定"
        >
          <Settings size={18} />
        </button>
      </header>

      {settingsOpen && (
        <div className="border-b bg-card px-4 py-3">
          <ConstraintsPanel
            items={constraints}
            onAdd={handleAdd}
            onRemove={handleRemove}
          />
        </div>
      )}

      <MessageList messages={messages} status={status} />
      <ChatInput
        input={input}
        isLoading={isLoading}
        onInputChange={setInput}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

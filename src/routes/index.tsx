import { createFileRoute } from "@tanstack/react-router"
import { useChat } from "@ai-sdk/react"
import { useState } from "react"
import type { FormEvent } from "react"
import { ChatInput } from "@/components/chat/ChatInput"
import { MessageList } from "@/components/chat/MessageList"

export const Route = createFileRoute("/")({ component: ChatPage })

function ChatPage() {
  const { messages, sendMessage, status } = useChat()
  const [input, setInput] = useState("")
  const isLoading = status === "submitted" || status === "streaming"

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return
    const text = input.trim()
    setInput("")
    await sendMessage({ text })
  }

  return (
    <div className="flex h-svh flex-col">
      <header className="border-b px-4 py-3">
        <h1 className="text-sm font-medium">
          もったいない AI — 献立エージェント
        </h1>
      </header>
      <MessageList messages={messages} />
      <ChatInput
        input={input}
        isLoading={isLoading}
        onInputChange={setInput}
        onSubmit={handleSubmit}
      />
    </div>
  )
}

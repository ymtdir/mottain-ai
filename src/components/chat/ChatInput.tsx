import type { FormEvent } from "react"
import { useRef } from "react"
import { Button } from "@/components/ui/button"

type Props = {
  input: string
  isLoading: boolean
  onInputChange: (value: string) => void
  onSubmit: (e: FormEvent<HTMLFormElement>) => void
}

export function ChatInput({
  input,
  isLoading,
  onInputChange,
  onSubmit,
}: Props) {
  const isComposing = useRef(false)

  return (
    <form onSubmit={onSubmit} className="flex gap-2 border-t p-4">
      <textarea
        className="flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
        rows={2}
        value={input}
        placeholder="在庫を伝えて献立を依頼しましょう（例: じゃがいも、人参、玉ねぎがあります。3日分の夕食を考えて）"
        onChange={(e) => onInputChange(e.target.value)}
        onCompositionStart={() => {
          isComposing.current = true
        }}
        onCompositionEnd={() => {
          isComposing.current = false
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey && !isComposing.current) {
            e.preventDefault()
            e.currentTarget.form?.requestSubmit()
          }
        }}
      />
      <Button type="submit" disabled={isLoading || !input.trim()}>
        {isLoading ? "生成中…" : "送信"}
      </Button>
    </form>
  )
}

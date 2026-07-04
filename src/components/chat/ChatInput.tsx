import type { FormEvent } from "react"
import { useRef } from "react"
import { ArrowUp } from "lucide-react"

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
  const hasInput = input.trim().length > 0

  return (
    <form onSubmit={onSubmit} className="relative p-4">
      <textarea
        className="w-full resize-none rounded-xl border bg-background px-3 py-2.5 pr-12 text-sm placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
        rows={4}
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
      {(hasInput || isLoading) && (
        <button
          type="submit"
          disabled={isLoading || !hasInput}
          className="absolute right-7 bottom-7 flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-opacity disabled:opacity-50"
        >
          <ArrowUp size={16} />
        </button>
      )}
    </form>
  )
}

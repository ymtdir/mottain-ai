import { useState, useRef } from "react"
import { X } from "lucide-react"
import type { AvoidanceItem } from "@/server/services/avoidance-guard"

type Props = {
  items: AvoidanceItem[]
  onAdd: (item: AvoidanceItem) => void
  onRemove: (name: string) => void
}

export function ConstraintsPanel({ items, onAdd, onRemove }: Props) {
  const [name, setName] = useState("")
  const isComposing = useRef(false)

  function handleAdd() {
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd({ name: trimmed, aliases: [] })
    setName("")
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onCompositionStart={() => {
            isComposing.current = true
          }}
          onCompositionEnd={() => {
            isComposing.current = false
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !isComposing.current) {
              e.preventDefault()
              handleAdd()
            }
          }}
          placeholder="食材名・料理名を入力"
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={!name.trim()}
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-40"
        >
          追加
        </button>
      </div>

      {items.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          回避リストは空です。
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {items.map((item) => (
            <li
              key={item.name}
              className="flex items-center justify-between rounded-md border px-2.5 py-1.5 text-sm"
            >
              <span>{item.name}</span>
              <button
                onClick={() => onRemove(item.name)}
                className="text-muted-foreground hover:text-destructive"
                aria-label={`${item.name}を削除`}
              >
                <X size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

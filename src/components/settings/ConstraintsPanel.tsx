import { useState, useRef } from "react"
import { X } from "lucide-react"
import type { AvoidanceItem } from "@/server/services/avoidance-guard"

type Props = {
  items: AvoidanceItem[]
  onAdd: (item: AvoidanceItem) => void
  onRemove: (name: string) => void
}

const TYPE_LABELS: Record<AvoidanceItem["type"], string> = {
  allergy: "アレルギー",
  dislike: "苦手",
}

export function ConstraintsPanel({ items, onAdd, onRemove }: Props) {
  const [name, setName] = useState("")
  const [type, setType] = useState<AvoidanceItem["type"]>("dislike")
  const isComposing = useRef(false)

  function handleAdd() {
    const trimmed = name.trim()
    if (!trimmed) return
    onAdd({ name: trimmed, aliases: [], type })
    setName("")
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">回避食材（アレルギー・苦手）</p>

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
          placeholder="食材名を入力"
          className="flex-1 rounded-md border border-input bg-background px-3 py-1.5 text-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as AvoidanceItem["type"])}
          className="rounded-md border border-input bg-background px-2 py-1.5 text-sm"
        >
          <option value="dislike">苦手</option>
          <option value="allergy">アレルギー</option>
        </select>
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
          回避食材は登録されていません。
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {items.map((item) => (
            <li
              key={item.name}
              className="flex items-center justify-between rounded-md border px-3 py-1.5 text-sm"
            >
              <span>
                {item.name}
                <span className="ml-1.5 text-xs text-muted-foreground">
                  {TYPE_LABELS[item.type]}
                </span>
              </span>
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

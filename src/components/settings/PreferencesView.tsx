import { useState, useRef } from "react"
import { X } from "lucide-react"
import type { PreferenceMemory } from "@/server/services/preference"

type Props = {
  preferences: PreferenceMemory
  onAddTendency: (note: string) => void
  onRemoveTendency: (attribute: string) => void
  onRemoveRecipe: (recipeName: string) => void
}

export function PreferencesView({
  preferences,
  onAddTendency,
  onRemoveTendency,
  onRemoveRecipe,
}: Props) {
  const [note, setNote] = useState("")
  const isComposing = useRef(false)
  const { globalTendencies, recipeAdjustments } = preferences

  function handleAdd() {
    const trimmed = note.trim()
    if (!trimmed) return
    onAddTendency(trimmed)
    setNote("")
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-2">
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
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
          placeholder="例: 辛さを控えめに"
          className="min-w-0 flex-1 rounded-md border border-input bg-background px-2.5 py-1.5 text-sm focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
        />
        <button
          onClick={handleAdd}
          disabled={!note.trim()}
          className="rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-40"
        >
          追加
        </button>
      </div>

      {globalTendencies.length === 0 && recipeAdjustments.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          好みはまだ登録されていません。
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {globalTendencies.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-muted-foreground">
                全体的な傾向
              </p>
              <ul className="flex flex-col gap-1">
                {globalTendencies.map((t) => (
                  <li
                    key={t.attribute}
                    className="flex items-start justify-between gap-1 rounded-md border px-2 py-1.5 text-xs"
                  >
                    <span className="min-w-0 leading-snug">
                      {t.adjustmentNote}
                    </span>
                    <button
                      onClick={() => onRemoveTendency(t.attribute)}
                      className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label="削除"
                    >
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {recipeAdjustments.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-muted-foreground">
                レシピ固有
              </p>
              <ul className="flex flex-col gap-1">
                {recipeAdjustments.map((r) => (
                  <li
                    key={r.recipeName}
                    className="flex items-start justify-between gap-1 rounded-md border px-2 py-1.5 text-xs"
                  >
                    <div className="min-w-0">
                      <p className="font-medium">{r.recipeName}</p>
                      <p className="text-muted-foreground">
                        {r.adjustments.join("、")}
                      </p>
                    </div>
                    <button
                      onClick={() => onRemoveRecipe(r.recipeName)}
                      className="mt-0.5 shrink-0 text-muted-foreground hover:text-destructive"
                      aria-label="削除"
                    >
                      <X size={12} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

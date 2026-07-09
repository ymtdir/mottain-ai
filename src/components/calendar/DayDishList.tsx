import { useState } from "react"
import type { MealLog } from "@/server/services/meal-log"
import type { SavedRecipeListItem } from "@/server/services/saved-recipe"
import { DishDetailDialog } from "./DishDetailDialog"

type Props = {
  logs: MealLog[]
  onDeleteLog: (id: string) => void
  onSaveRecipe: (log: MealLog) => void
  savedRecipes: SavedRecipeListItem[]
}

export function DayDishList({
  logs,
  onDeleteLog,
  onSaveRecipe,
  savedRecipes,
}: Props) {
  const [selected, setSelected] = useState<MealLog | null>(null)

  return (
    <>
      <ul className="flex flex-col gap-0.5">
        {logs.map((log) => (
          <li key={log.id}>
            <button
              onClick={() => setSelected(log)}
              className="w-full rounded px-1 py-0.5 text-left text-xs text-foreground hover:bg-accent/60 hover:text-accent-foreground"
            >
              {log.content.title}
            </button>
          </li>
        ))}
      </ul>

      {selected && (
        <DishDetailDialog
          log={selected}
          open
          onOpenChange={(open) => {
            if (!open) setSelected(null)
          }}
          onDelete={(id) => {
            onDeleteLog(id)
            setSelected(null)
          }}
          onSaveRecipe={(log) => {
            onSaveRecipe(log)
          }}
          savedRecipes={savedRecipes}
        />
      )}
    </>
  )
}

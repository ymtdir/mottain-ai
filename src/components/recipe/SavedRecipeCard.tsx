import { useState } from "react"
import { ChevronDown, ChevronUp, ImageOff, Loader2 } from "lucide-react"
import type { SavedRecipeListItem } from "@/server/services/saved-recipe"

type Props = {
  recipe: SavedRecipeListItem
}

function IllustrationArea({
  status,
  id,
}: {
  status: SavedRecipeListItem["illustrationStatus"]
  id: string
}) {
  if (status === "ready") {
    return (
      <img
        src={`/api/recipes/${id}/illustration`}
        alt="料理のイラスト"
        className="h-28 w-full rounded-md bg-muted object-cover"
      />
    )
  }
  if (status === "pending" || status === "generating") {
    return (
      <div className="flex h-28 w-full items-center justify-center rounded-md bg-muted">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
        <span className="ml-2 text-xs text-muted-foreground">生成中...</span>
      </div>
    )
  }
  return (
    <div className="flex h-28 w-full items-center justify-center rounded-md bg-muted">
      <ImageOff size={20} className="text-muted-foreground" />
      <span className="ml-2 text-xs text-muted-foreground">イラストなし</span>
    </div>
  )
}

export function SavedRecipeCard({ recipe }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="rounded-lg border bg-card p-3 text-sm">
      <IllustrationArea status={recipe.illustrationStatus} id={recipe.id} />

      <button
        onClick={() => setExpanded((v) => !v)}
        className="mt-2 flex w-full items-center justify-between gap-2 text-left"
        aria-expanded={expanded}
      >
        <span className="font-medium">{recipe.content.title}</span>
        {expanded ? (
          <ChevronUp size={15} className="shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown size={15} className="shrink-0 text-muted-foreground" />
        )}
      </button>

      {expanded && (
        <div className="mt-2 flex flex-col gap-2">
          {recipe.content.ingredients.length > 0 && (
            <div className="text-xs">
              <p className="font-medium text-foreground">【材料】</p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {recipe.content.ingredients.map((ing) => (
                  <li key={ing.name}>
                    ・{ing.name}
                    {ing.amount && <span className="ml-1">{ing.amount}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {recipe.content.steps.length > 0 && (
            <div className="text-xs">
              <p className="font-medium text-foreground">【作り方】</p>
              <ol className="mt-1 space-y-0.5 text-muted-foreground">
                {recipe.content.steps.map((step, i) => (
                  <li key={i}>
                    {i + 1}. {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {recipe.content.notes && (
            <p className="rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
              ⚠️ {recipe.content.notes}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

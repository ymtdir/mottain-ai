import { useState } from "react"
import { ImageOff, Loader2, RotateCw, Trash2 } from "lucide-react"
import type { SavedRecipeListItem } from "@/server/services/saved-recipe"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Card, CardContent } from "@/components/ui/card"

type Props = {
  recipe: SavedRecipeListItem
  onRetry: () => void
  onDelete: () => void
}

function IllustrationArea({
  status,
  id,
  onRetry,
}: {
  status: SavedRecipeListItem["illustrationStatus"]
  id: string
  onRetry: () => void
}) {
  if (status === "ready") {
    return (
      <img
        src={`/api/recipes/${id}/illustration`}
        alt="料理のイラスト"
        className="h-32 w-full object-cover"
      />
    )
  }
  if (status === "pending" || status === "generating") {
    return (
      <div className="flex h-32 w-full items-center justify-center bg-muted">
        <Loader2 size={20} className="animate-spin text-muted-foreground" />
        <span className="ml-2 text-xs text-muted-foreground">生成中...</span>
      </div>
    )
  }
  // failed
  return (
    <div className="flex h-32 w-full flex-col items-center justify-center gap-1.5 bg-muted">
      <div className="flex items-center text-muted-foreground">
        <ImageOff size={20} />
        <span className="ml-2 text-xs">生成に失敗しました</span>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRetry()
        }}
        className="flex items-center gap-1 rounded border bg-background px-2 py-0.5 text-xs text-foreground hover:bg-muted"
      >
        <RotateCw size={12} />
        再試行
      </button>
    </div>
  )
}

export function SavedRecipeCard({ recipe, onRetry, onDelete }: Props) {
  const [expanded, setExpanded] = useState(false)

  return (
    <Card
      size="sm"
      className="cursor-pointer text-sm"
      onClick={() => setExpanded((v) => !v)}
    >
      <IllustrationArea
        status={recipe.illustrationStatus}
        id={recipe.id}
        onRetry={onRetry}
      />

      <CardContent className="pt-2">
        <p className="leading-snug font-medium">{recipe.content.title}</p>

        {expanded && (
          <div className="mt-3 flex flex-col gap-2">
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

            <div className="flex justify-end pt-1">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <button
                    aria-label="削除"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 size={13} />
                    削除
                  </button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>レシピを削除しますか？</AlertDialogTitle>
                    <AlertDialogDescription>
                      「{recipe.content.title}
                      」を削除します。この操作は取り消せません。
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>キャンセル</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={onDelete}
                      className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
                    >
                      削除
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

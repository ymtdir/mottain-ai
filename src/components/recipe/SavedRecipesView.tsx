import { useEffect, useRef, useCallback } from "react"
import { BookOpen } from "lucide-react"
import { SavedRecipeCard } from "./SavedRecipeCard"
import type { SavedRecipeListItem } from "@/server/services/saved-recipe"

type Props = {
  recipes: SavedRecipeListItem[]
  onRefresh: () => void
}

export function SavedRecipesView({ recipes, onRefresh }: Props) {
  // 表示中は未完了レシピの生成を保証しつつ、状況が変わるまで軽くポーリングする（R1/R4）
  const firedRef = useRef<Set<string>>(new Set())

  const fireIllustration = useCallback(
    (id: string) => {
      fetch(`/api/recipes/${id}/illustration`, { method: "POST" })
        .then(() => onRefresh())
        .catch(() => {})
    },
    [onRefresh]
  )

  // `pending` のレシピは開封時に一度だけ生成を発火する（`failed` は手動再試行に委ねる）
  useEffect(() => {
    for (const r of recipes) {
      if (r.illustrationStatus !== "pending") continue
      if (firedRef.current.has(r.id)) continue
      firedRef.current.add(r.id)
      fireIllustration(r.id)
    }
  }, [recipes, fireIllustration])

  // 生成中・生成待ちがある間はポーリングして ready を拾う
  useEffect(() => {
    const inflight = recipes.some(
      (r) =>
        r.illustrationStatus === "pending" ||
        r.illustrationStatus === "generating"
    )
    if (!inflight) return
    const timer = setInterval(onRefresh, 4000)
    return () => clearInterval(timer)
  }, [recipes, onRefresh])

  if (recipes.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-8 text-center text-muted-foreground">
        <BookOpen size={32} strokeWidth={1.5} />
        <p className="text-sm">保存したレシピはまだありません</p>
        <p className="text-xs">
          献立のレシピカードにある「保存」ボタンで登録できます
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      {recipes.map((recipe) => (
        <SavedRecipeCard
          key={recipe.id}
          recipe={recipe}
          onRetry={() => fireIllustration(recipe.id)}
        />
      ))}
    </div>
  )
}

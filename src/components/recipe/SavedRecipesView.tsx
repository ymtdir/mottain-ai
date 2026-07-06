import { BookOpen } from "lucide-react"
import { SavedRecipeCard } from "./SavedRecipeCard"
import type { SavedRecipeListItem } from "@/server/services/saved-recipe"

type Props = {
  recipes: SavedRecipeListItem[]
}

export function SavedRecipesView({ recipes }: Props) {
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
        <SavedRecipeCard key={recipe.id} recipe={recipe} />
      ))}
    </div>
  )
}

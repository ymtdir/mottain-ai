import { createFileRoute, Link } from "@tanstack/react-router"
import { useState, useEffect, useCallback } from "react"
import { ArrowLeft, Star } from "lucide-react"
import { toast } from "sonner"
import { SavedRecipesView } from "@/components/recipe/SavedRecipesView"
import type { SavedRecipeListItem } from "@/server/services/saved-recipe"

export const Route = createFileRoute("/favorites")({ component: FavoritesPage })

function FavoritesPage() {
  const [savedRecipes, setSavedRecipes] = useState<SavedRecipeListItem[]>([])

  const loadSavedRecipes = useCallback(() => {
    fetch("/api/recipes")
      .then((r) => r.json())
      .then(setSavedRecipes)
      .catch(() => {})
  }, [])

  const handleDelete = useCallback(async (id: string) => {
    const res = await fetch(`/api/recipes/${id}`, {
      method: "DELETE",
    }).catch(() => null)
    if (res?.ok) {
      setSavedRecipes((prev) => prev.filter((r) => r.id !== id))
    } else {
      toast.error("削除に失敗しました。もう一度お試しください。")
    }
  }, [])

  useEffect(() => {
    loadSavedRecipes()
  }, [loadSavedRecipes])

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="sticky top-0 z-10 flex items-center gap-3 border-b bg-background/95 px-6 py-4 backdrop-blur">
        <Link
          to="/"
          className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="チャットに戻る"
        >
          <ArrowLeft size={20} />
        </Link>
        <Star size={20} className="text-yellow-400" fill="currentColor" />
        <h1 className="text-base font-semibold">お気に入りレシピ</h1>
      </header>
      <main className="flex-1 p-6">
        <SavedRecipesView
          recipes={savedRecipes}
          onRefresh={loadSavedRecipes}
          onDeleteRecipe={handleDelete}
        />
      </main>
    </div>
  )
}

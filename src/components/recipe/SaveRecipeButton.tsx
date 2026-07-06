import { useState, useEffect } from "react"
import { Heart } from "lucide-react"
import type { SavedRecipeContent } from "@/server/services/saved-recipe"

type Props = {
  content: SavedRecipeContent
  isSaved: boolean
}

export function SaveRecipeButton({ content, isSaved }: Props) {
  const [saved, setSaved] = useState(isSaved)
  const [loading, setLoading] = useState(false)

  // savedRecipes がページロード後に届いたとき（race condition）に同期する
  useEffect(() => {
    if (isSaved) setSaved(true)
  }, [isSaved])

  async function handleClick() {
    if (saved || loading) return
    setLoading(true)
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      })
      if (res.ok) setSaved(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={saved || loading}
      aria-label={saved ? "お気に入り登録済み" : "お気に入りに登録"}
      className={`flex items-center gap-1 rounded px-2 py-0.5 text-xs transition-colors ${
        saved
          ? "cursor-default text-rose-500"
          : "text-muted-foreground hover:bg-rose-50 hover:text-rose-500"
      }`}
    >
      <Heart size={13} fill={saved ? "currentColor" : "none"} />
      <span>{saved ? "保存済み" : "保存"}</span>
    </button>
  )
}

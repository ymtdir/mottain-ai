import { useState, useEffect } from "react"
import { z } from "zod"
import { toast } from "sonner"
import { Heart } from "lucide-react"
import type { SavedRecipeContent } from "@/server/services/saved-recipe"

type Props = {
  content: SavedRecipeContent
  isSaved: boolean
  onSave?: (title: string) => void
}

export function SaveRecipeButton({ content, isSaved, onSave }: Props) {
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
      if (!res.ok) {
        const errorSchema = z.object({ error: z.string().optional() })
        const parsed = errorSchema.safeParse(await res.json().catch(() => ({})))
        toast.error(
          parsed.success && parsed.data.error
            ? `保存に失敗しました: ${parsed.data.error}`
            : "保存に失敗しました。もう一度お試しください。"
        )
        return
      }
      setSaved(true)
      onSave?.(content.title)
      // 登録後にイラスト生成を先行発火（fire-and-forget）。結果は保存レシピを
      // 開いたときにポーリングで反映される（ADR-13）
      const savedResponseSchema = z.object({
        id: z.string().uuid().optional(),
      })
      const parsed = savedResponseSchema.safeParse(await res.json())
      if (parsed.success && parsed.data.id) {
        void fetch(`/api/recipes/${parsed.data.id}/illustration`, {
          method: "POST",
        }).catch(() => {})
      }
    } catch {
      toast.error("保存に失敗しました。通信環境をご確認ください。")
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

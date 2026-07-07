import { useState } from "react"
import { Trash2, Heart, MessageCircle } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
import type { MealLog } from "@/server/services/meal-log"

type Props = {
  log: MealLog
  open: boolean
  onOpenChange: (open: boolean) => void
  onDelete: (id: string) => void
  onSaveRecipe: (log: MealLog) => void
}

export function DishDetailDialog({
  log,
  open,
  onOpenChange,
  onDelete,
  onSaveRecipe,
}: Props) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [comment, setComment] = useState("")
  const [sending, setSending] = useState(false)

  async function handleSaveRecipe() {
    if (saving || saved) return
    setSaving(true)
    try {
      const res = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: log.content }),
      })
      if (!res.ok) {
        toast.error("お気に入り登録に失敗しました。もう一度お試しください。")
        return
      }
      setSaved(true)
      onSaveRecipe(log)
      toast.success(`「${log.content.title}」をお気に入りに登録しました。`)
    } catch {
      toast.error("通信エラーが発生しました。")
    } finally {
      setSaving(false)
    }
  }

  async function handleSendComment() {
    const text = comment.trim()
    if (!text || sending) return
    setSending(true)
    try {
      const res = await fetch("/api/meals/comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dishTitle: log.content.title,
          eatenOn: log.eatenOn,
          comment: text,
        }),
      })
      if (!res.ok) {
        toast.error("送信に失敗しました。もう一度お試しください。")
        return
      }
      setComment("")
      toast.success("コメントありがとうございます！食の好みに保存し、次回の献立の参考にします。")
    } catch {
      toast.error("通信エラーが発生しました。")
    } finally {
      setSending(false)
    }
  }

  const { content } = log

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{content.title}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3 text-sm">
          {content.ingredients.length > 0 && (
            <div>
              <p className="font-medium text-foreground">【材料】</p>
              <ul className="mt-1 space-y-0.5 text-muted-foreground">
                {content.ingredients.map((ing) => (
                  <li key={ing.name}>
                    ・{ing.name}
                    {ing.amount && <span className="ml-1">{ing.amount}</span>}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {content.steps.length > 0 && (
            <div>
              <p className="font-medium text-foreground">【作り方】</p>
              <ol className="mt-1 space-y-0.5 text-muted-foreground">
                {content.steps.map((step, i) => (
                  <li key={i}>
                    {i + 1}. {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="flex flex-col gap-2 border-t pt-3">
            <p className="text-xs font-medium text-foreground">
              AIにコメントを送る
            </p>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                  e.preventDefault()
                  handleSendComment()
                }
              }}
              placeholder="「もう少し簡単なアレンジが知りたい」など..."
              rows={2}
              className="w-full resize-none rounded-md border bg-background px-3 py-2 text-xs placeholder:text-muted-foreground focus:ring-1 focus:ring-ring focus:outline-none"
            />
            <div className="flex items-center justify-between">
              <button
                onClick={handleSendComment}
                disabled={!comment.trim() || sending}
                className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent/60 hover:text-accent-foreground disabled:cursor-not-allowed disabled:opacity-40"
              >
                <MessageCircle size={13} />
                {sending ? "送信中..." : "AIに送る"}
              </button>

              <div className="flex items-center gap-1">
                <button
                  onClick={handleSaveRecipe}
                  disabled={saving || saved}
                  className={`flex items-center gap-1 rounded px-2 py-1 text-xs transition-colors ${
                    saved
                      ? "cursor-default text-rose-500"
                      : "text-muted-foreground hover:bg-rose-50 hover:text-rose-500"
                  }`}
                >
                  <Heart size={13} fill={saved ? "currentColor" : "none"} />
                  {saved
                    ? "保存済み"
                    : saving
                      ? "保存中..."
                      : "お気に入りに登録"}
                </button>

                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                      <Trash2 size={13} />
                      記録を削除
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>記録を削除しますか？</AlertDialogTitle>
                      <AlertDialogDescription>
                        「{content.title}
                        」の記録を削除します。この操作は取り消せません。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>キャンセル</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => onDelete(log.id)}
                        variant="destructive"
                      >
                        削除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

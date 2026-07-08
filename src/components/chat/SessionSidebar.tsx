import { useState, useRef } from "react"
import {
  Trash2,
  Pencil,
  Check,
  X,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
  HeartCrack,
  MessageSquarePlus,
  LogOut,
  ChevronUp,
  User,
} from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  useSidebar,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
} from "@/components/ui/alert-dialog"
import { ConstraintsPanel } from "@/components/settings/ConstraintsPanel"
import { PreferencesView } from "@/components/settings/PreferencesView"
import type { ChatSession } from "@/server/services/chat-session"
import type { AvoidanceItem } from "@/server/services/avoidance-guard"
import type { PreferenceMemory } from "@/server/services/preference"

function ExpandedToggle() {
  const { toggleSidebar } = useSidebar()
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={toggleSidebar}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label="サイドバーを閉じる"
    >
      {hovered ? <PanelLeftClose size={18} /> : <PanelLeft size={18} />}
    </button>
  )
}

function CollapsedToggle() {
  const { toggleSidebar } = useSidebar()
  const [hovered, setHovered] = useState(false)
  return (
    <button
      onClick={toggleSidebar}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label="サイドバーを開く"
    >
      {hovered ? (
        <PanelLeftOpen size={18} />
      ) : (
        <img src="/favicon.ico" alt="MottainAI" className="size-4" />
      )}
    </button>
  )
}

type Props = {
  sessions: ChatSession[]
  activeId: string | null
  onSelect: (id: string) => void
  onNewChat: () => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  constraints: AvoidanceItem[]
  onAddConstraint: (item: AvoidanceItem) => void
  onRemoveConstraint: (name: string) => void
  preferences: PreferenceMemory
  onAddTendency: (note: string) => void
  onRemoveTendency: (attribute: string) => void
  onRemoveRecipe: (recipeName: string) => void
  userEmail: string
  userName: string
  onLogout: () => void
}

export function SessionSidebar({
  sessions,
  activeId,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
  constraints,
  onAddConstraint,
  onRemoveConstraint,
  preferences,
  onAddTendency,
  onRemoveTendency,
  onRemoveRecipe,
  userEmail,
  userName,
  onLogout,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
  const [deletingSession, setDeletingSession] = useState<ChatSession | null>(
    null
  )
  // クローズアニメーション中もセッション名を表示し続けるため最後の非null値を保持する
  const deletingSessionRef = useRef<ChatSession | null>(null)
  if (deletingSession) deletingSessionRef.current = deletingSession
  const [constraintsOpen, setConstraintsOpen] = useState(false)
  const [prefsOpen, setPrefsOpen] = useState(false)
  const isComposing = useRef(false)

  function startEdit(s: ChatSession) {
    setEditingId(s.id)
    setEditName(s.name)
  }

  function commitEdit(id: string) {
    const trimmed = editName.trim()
    if (trimmed) onRename(id, trimmed)
    setEditingId(null)
  }

  return (
    <>
      <Sidebar collapsible="icon">
        {/* アプリ名 + 開閉トグル */}
        <SidebarHeader className="px-3 py-3">
          <div className="flex items-center justify-between group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-2">
              <img src="/favicon.ico" alt="" className="size-5 shrink-0" />
              <span className="font-[family-name:var(--font-display)] text-xl font-bold tracking-wide text-foreground">
                MottainAI
              </span>
            </div>
            <ExpandedToggle />
          </div>
          <div className="hidden justify-center group-data-[collapsible=icon]:flex">
            <CollapsedToggle />
          </div>
        </SidebarHeader>

        <SidebarContent className="p-2">
          <SidebarMenu className="gap-1">
            <SidebarMenuItem>
              <SidebarMenuButton
                isActive={activeId === null}
                onClick={onNewChat}
                tooltip="新しいチャット"
              >
                <MessageSquarePlus size={17} />
                <span>新しいチャット</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setPrefsOpen(true)}
                tooltip="食の好み"
              >
                <SlidersHorizontal size={17} />
                <span>食の好み</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => setConstraintsOpen(true)}
                tooltip="苦手なもの"
              >
                <HeartCrack size={17} />
                <span>苦手なもの</span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>

          {/* 会話履歴: 折りたたみ時は非表示 */}
          <div className="group-data-[collapsible=icon]:hidden">
            {sessions.length > 0 && (
              <p className="mt-3 mb-2 px-2 text-xs font-medium text-muted-foreground">
                会話履歴
              </p>
            )}
            <SidebarMenu className="gap-1">
              {sessions.map((s) => (
                <SidebarMenuItem key={s.id}>
                  {editingId === s.id ? (
                    <div className="flex items-center gap-1 px-2 py-1.5">
                      <input
                        autoFocus
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onCompositionStart={() => {
                          isComposing.current = true
                        }}
                        onCompositionEnd={() => {
                          isComposing.current = false
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !isComposing.current) {
                            e.preventDefault()
                            commitEdit(s.id)
                          }
                          if (e.key === "Escape") setEditingId(null)
                        }}
                        className="min-w-0 flex-1 rounded border border-input bg-background px-1.5 py-0.5 text-xs focus-visible:ring-1 focus-visible:ring-ring focus-visible:outline-none"
                      />
                      <button
                        onClick={() => commitEdit(s.id)}
                        className="text-primary hover:text-primary/80"
                        aria-label="確定"
                      >
                        <Check size={15} />
                      </button>
                      <button
                        onClick={() => setEditingId(null)}
                        className="text-muted-foreground hover:text-foreground"
                        aria-label="キャンセル"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <SidebarMenuButton
                        isActive={s.id === activeId}
                        onClick={() => onSelect(s.id)}
                        tooltip={s.name}
                        className="group-hover/menu-item:pr-14"
                      >
                        <span className="truncate">{s.name}</span>
                      </SidebarMenuButton>
                      <div className="absolute top-1/2 right-1 hidden -translate-y-1/2 items-center gap-0.5 group-hover/menu-item:flex">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            startEdit(s)
                          }}
                          className="rounded p-0.5 text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          aria-label="名前を変更"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            setDeletingSession(s)
                          }}
                          className="rounded p-0.5 text-muted-foreground hover:bg-sidebar-accent hover:text-destructive"
                          aria-label={`${s.name}を削除`}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </>
                  )}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </div>
        </SidebarContent>

        <SidebarFooter className="p-2">
          <SidebarMenu>
            <SidebarMenuItem>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <SidebarMenuButton
                    tooltip={userName || userEmail || "ユーザー"}
                  >
                    <User size={17} />
                    <span className="truncate">
                      {userName || userEmail || "ユーザー"}
                    </span>
                    <ChevronUp className="ml-auto" size={15} />
                  </SidebarMenuButton>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  side="top"
                  className="w-56 bg-sidebar text-sidebar-foreground ring-sidebar-border"
                >
                  <DropdownMenuItem
                    onClick={onLogout}
                    className="text-destructive focus:text-destructive"
                  >
                    <LogOut size={15} />
                    ログアウト
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarFooter>
      </Sidebar>

      {/* 好みダイアログ */}
      <Dialog open={prefsOpen} onOpenChange={setPrefsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>食の好み</DialogTitle>
          </DialogHeader>
          <PreferencesView
            preferences={preferences}
            onAddTendency={onAddTendency}
            onRemoveTendency={onRemoveTendency}
            onRemoveRecipe={onRemoveRecipe}
          />
        </DialogContent>
      </Dialog>

      {/* 回避食材ダイアログ */}
      <Dialog open={constraintsOpen} onOpenChange={setConstraintsOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>苦手なもの</DialogTitle>
          </DialogHeader>
          <ConstraintsPanel
            items={constraints}
            onAdd={onAddConstraint}
            onRemove={onRemoveConstraint}
          />
        </DialogContent>
      </Dialog>

      {/* セッション削除確認ダイアログ */}
      <AlertDialog
        open={!!deletingSession}
        onOpenChange={(open) => {
          if (!open) setDeletingSession(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>会話を削除しますか？</AlertDialogTitle>
            <AlertDialogDescription>
              「{deletingSessionRef.current?.name}
              」を削除します。この操作は取り消せません。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>キャンセル</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={() => {
                if (deletingSession) {
                  onDelete(deletingSession.id)
                  setDeletingSession(null)
                }
              }}
            >
              削除
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

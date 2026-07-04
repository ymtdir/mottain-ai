import { useState, useRef } from "react"
import {
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  PanelLeft,
  PanelLeftClose,
  PanelLeftOpen,
  SlidersHorizontal,
  HeartCrack,
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
  onCreate: () => void
  onRename: (id: string, name: string) => void
  onDelete: (id: string) => void
  constraints: AvoidanceItem[]
  onAddConstraint: (item: AvoidanceItem) => void
  onRemoveConstraint: (name: string) => void
  preferences: PreferenceMemory
  onAddTendency: (note: string) => void
  onRemoveTendency: (attribute: string) => void
  onRemoveRecipe: (recipeName: string) => void
}

export function SessionSidebar({
  sessions,
  activeId,
  onSelect,
  onCreate,
  onRename,
  onDelete,
  constraints,
  onAddConstraint,
  onRemoveConstraint,
  preferences,
  onAddTendency,
  onRemoveTendency,
  onRemoveRecipe,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState("")
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
              <span className="font-[family-name:var(--font-display)] text-lg font-bold tracking-wide text-foreground">
                MottainAI
              </span>
            </div>
            <ExpandedToggle />
          </div>
          <div className="hidden justify-center group-data-[collapsible=icon]:flex">
            <CollapsedToggle />
          </div>
        </SidebarHeader>

        {/* 会話履歴ラベル + 新規作成 */}
        <SidebarHeader className="px-3 py-2">
          <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
            <span className="text-xs font-semibold text-muted-foreground group-data-[collapsible=icon]:hidden">
              会話履歴
            </span>
            <button
              onClick={onCreate}
              className="rounded p-1 text-muted-foreground hover:bg-muted"
              aria-label="新しい会話"
            >
              <Plus size={17} />
            </button>
          </div>
        </SidebarHeader>

        <SidebarContent className="p-2 group-data-[collapsible=icon]:hidden">
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
                    >
                      <span>{s.name}</span>
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
                          if (window.confirm(`「${s.name}」を削除しますか？`)) {
                            onDelete(s.id)
                          }
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
        </SidebarContent>

        {/* 設定メニュー */}
        <SidebarFooter className="p-2">
          <SidebarMenu>
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
    </>
  )
}

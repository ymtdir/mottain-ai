import { MessageCircle, CalendarDays, Star } from "lucide-react"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export type AppTab = "chat" | "calendar" | "favorites"

type Props = {
  current: AppTab
  onSelectChat: () => void
  onSelectCalendar: () => void
  onSelectFavorites: () => void
}

export function AppHeader({
  current,
  onSelectChat,
  onSelectCalendar,
  onSelectFavorites,
}: Props) {
  function handleChange(value: string) {
    if (value === current) return
    if (value === "chat") onSelectChat()
    else if (value === "calendar") onSelectCalendar()
    else if (value === "favorites") onSelectFavorites()
  }

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center justify-center border-b bg-background/95 px-4 backdrop-blur">
      <Tabs value={current} onValueChange={handleChange}>
        <TabsList>
          <TabsTrigger
            value="chat"
            className="data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-accent-foreground"
          >
            <MessageCircle />
            チャット
          </TabsTrigger>
          <TabsTrigger
            value="calendar"
            className="data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-accent-foreground"
          >
            <CalendarDays />
            カレンダー
          </TabsTrigger>
          <TabsTrigger
            value="favorites"
            className="data-[state=active]:bg-sidebar-accent data-[state=active]:text-sidebar-accent-foreground"
          >
            <Star />
            お気に入り
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </header>
  )
}

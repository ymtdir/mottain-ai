import { ChevronLeft, ChevronRight } from "lucide-react"
import type { MealLog } from "@/server/services/meal-log"
import type { SavedRecipeListItem } from "@/server/services/saved-recipe"
import { todayInTokyo, toDateString } from "@/lib/date"
import { DayDishList } from "./DayDishList"

type Props = {
  month: string
  logs: MealLog[]
  onPrevMonth: () => void
  onNextMonth: () => void
  onDeleteLog: (id: string) => void
  onSaveRecipe: (log: MealLog) => void
  savedRecipes: SavedRecipeListItem[]
}

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"]

function buildCalendarDays(month: string): (number | null)[] {
  const [year, mon] = month.split("-").map(Number)
  const firstDay = new Date(year, mon - 1, 1).getDay()
  const daysInMonth = new Date(year, mon, 0).getDate()
  const cells: (number | null)[] = Array(firstDay).fill(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)
  return cells
}

function formatMonth(month: string): string {
  const [year, mon] = month.split("-")
  return `${year}年${Number(mon)}月`
}

function todayString(): string {
  return toDateString(todayInTokyo())
}

export function MonthCalendar({
  month,
  logs,
  onPrevMonth,
  onNextMonth,
  onDeleteLog,
  onSaveRecipe,
  savedRecipes,
}: Props) {
  const cells = buildCalendarDays(month)
  const today = todayString()
  const [year, mon] = month.split("-")

  const logsByDate = new Map<string, MealLog[]>()
  for (const log of logs) {
    const arr = logsByDate.get(log.eatenOn) ?? []
    arr.push(log)
    logsByDate.set(log.eatenOn, arr)
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          onClick={onPrevMonth}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="前の月"
        >
          <ChevronLeft size={18} />
        </button>
        <h2 className="text-base font-medium">{formatMonth(month)}</h2>
        <button
          onClick={onNextMonth}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="次の月"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 text-center text-xs font-medium text-muted-foreground">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-px rounded-lg border bg-border">
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={i} className="min-h-20 bg-muted/40 p-1" />
          }
          const dateStr = `${year}-${mon}-${String(day).padStart(2, "0")}`
          const dayLogs = logsByDate.get(dateStr) ?? []
          const isToday = dateStr === today
          const hasLogs = dayLogs.length > 0
          return (
            <div key={i} className="min-h-20 bg-card p-1">
              <div
                className={`mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${
                  isToday
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground"
                }`}
              >
                {day}
              </div>
              {hasLogs && (
                <DayDishList
                  logs={dayLogs}
                  onDeleteLog={onDeleteLog}
                  onSaveRecipe={onSaveRecipe}
                  savedRecipes={savedRecipes}
                />
              )}
            </div>
          )
        })}
      </div>

      {logs.length === 0 && (
        <p className="py-8 text-center text-sm text-muted-foreground">
          この月の記録はまだありません
        </p>
      )}
    </div>
  )
}

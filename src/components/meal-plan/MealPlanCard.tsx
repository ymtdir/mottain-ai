import type { MealPlan, Recipe } from "@/server/services/meal-plan"

type Props = {
  mealPlan: MealPlan
}

const normalize = (s: string) => s.trim().replace(/\s+/g, " ")

/** タイトルが同じ日（まとめ調理の残り日など）を1つにまとめたグループ */
type MealGroup = {
  days: number[]
  title: string
  ingredients: Recipe["ingredients"]
  steps: string[]
  notes: string | null
}

/**
 * 同じ料理名の日を1グループにまとめる。まとめ調理（カレー等）の残り日は
 * 材料・手順が空なので、材料・手順を持つ「調理日」を代表として採用する。
 */
function groupMealsByTitle(meals: Recipe[]): MealGroup[] {
  const byTitle = new Map<string, MealGroup>()
  for (const meal of meals) {
    const key = normalize(meal.title)
    const existing = byTitle.get(key)
    if (!existing) {
      byTitle.set(key, {
        days: [meal.day],
        title: meal.title,
        ingredients: meal.ingredients,
        steps: meal.steps,
        notes: meal.notes,
      })
      continue
    }
    existing.days.push(meal.day)
    const existingEmpty =
      existing.ingredients.length === 0 && existing.steps.length === 0
    const mealHasContent = meal.ingredients.length > 0 || meal.steps.length > 0
    if (existingEmpty && mealHasContent) {
      existing.title = meal.title
      existing.ingredients = meal.ingredients
      existing.steps = meal.steps
      existing.notes = meal.notes
    }
  }

  const groups = [...byTitle.values()]
  for (const g of groups) g.days.sort((a, b) => a - b)
  groups.sort((a, b) => a.days[0] - b.days[0])
  return groups
}

export function MealPlanCard({ mealPlan }: Props) {
  const groups = groupMealsByTitle(mealPlan.meals)

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">
        夕食 {mealPlan.periodDays} 日分の献立
      </p>
      <div className="flex flex-col gap-3">
        {groups.map((group) => (
          <div
            key={group.days.join("-")}
            className="rounded-lg border bg-background p-4 text-sm"
          >
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-muted-foreground">
                {group.days.join("・")} 日目
              </span>
              <span className="font-medium">{group.title}</span>
            </div>

            {group.ingredients.length > 0 && (
              <div className="mt-2 text-xs">
                <p className="font-medium text-foreground">【材料】</p>
                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                  {group.ingredients.map((i) => (
                    <li key={i.name}>
                      ・{i.name}
                      {i.amount && <span className="ml-1">{i.amount}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {group.steps.length > 0 && (
              <div className="mt-2 text-xs">
                <p className="font-medium text-foreground">【作り方】</p>
                <ol className="mt-1 space-y-0.5 text-muted-foreground">
                  {group.steps.map((step, i) => (
                    <li key={i}>
                      {i + 1}. {step}
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {group.notes && (
              <p className="mt-2 rounded bg-accent px-2 py-1 text-xs text-accent-foreground">
                ⚠️ {group.notes}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

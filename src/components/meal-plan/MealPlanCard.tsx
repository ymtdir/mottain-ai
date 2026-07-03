import type { MealPlan } from "@/server/services/meal-plan"

type Props = {
  mealPlan: MealPlan
}

export function MealPlanCard({ mealPlan }: Props) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm font-medium">
        夕食 {mealPlan.periodDays} 日分の献立
      </p>
      <div className="flex flex-col gap-3">
        {mealPlan.meals.map((meal) => (
          <div
            key={meal.day}
            className="rounded-lg border bg-background p-3 text-sm"
          >
            <div className="flex items-baseline gap-2">
              <span className="text-muted-foreground text-xs">
                {meal.day} 日目
              </span>
              <span className="font-medium">{meal.title}</span>
            </div>

            {meal.ingredients.length > 0 && (
              <p className="text-muted-foreground mt-2 text-xs">
                材料:{" "}
                {meal.ingredients
                  .map((i) => (i.amount ? `${i.name}（${i.amount}）` : i.name))
                  .join("、")}
              </p>
            )}

            {meal.steps.length > 0 && (
              <ol className="mt-2 list-inside list-decimal space-y-0.5 text-xs">
                {meal.steps.map((step, i) => (
                  <li key={i}>{step}</li>
                ))}
              </ol>
            )}

            {meal.notes && (
              <p className="mt-2 rounded bg-amber-50 px-2 py-1 text-xs text-amber-700">
                ⚠️ {meal.notes}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

import type { MealPlan } from "@/server/services/meal-plan"
import { SaveRecipeButton } from "@/components/recipe/SaveRecipeButton"

type Props = {
  mealPlan: MealPlan
  savedTitles?: Set<string>
  onSaveRecipe?: (title: string) => void
}

const normalize = (s: string) => s.trim().replace(/\s+/g, " ")

export function MealPlanCard({ mealPlan, savedTitles, onSaveRecipe }: Props) {
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
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-muted-foreground">
                  {meal.day} 日目
                </span>
                <span className="font-medium">{meal.title}</span>
              </div>
              <SaveRecipeButton
                content={{
                  title: meal.title,
                  ingredients: meal.ingredients,
                  steps: meal.steps,
                  notes: meal.notes,
                }}
                isSaved={savedTitles?.has(normalize(meal.title)) ?? false}
                onSave={onSaveRecipe}
              />
            </div>

            {meal.ingredients.length > 0 && (
              <div className="mt-2 text-xs">
                <p className="font-medium text-foreground">【材料】</p>
                <ul className="mt-1 space-y-0.5 text-muted-foreground">
                  {meal.ingredients.map((i) => (
                    <li key={i.name}>
                      ・{i.name}
                      {i.amount && <span className="ml-1">{i.amount}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {meal.steps.length > 0 && (
              <div className="mt-2 text-xs">
                <p className="font-medium text-foreground">【作り方】</p>
                <ol className="mt-1 space-y-0.5 text-muted-foreground">
                  {meal.steps.map((step, i) => (
                    <li key={i}>
                      {i + 1}. {step}
                    </li>
                  ))}
                </ol>
              </div>
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

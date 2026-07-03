import { isTextUIPart, isToolUIPart, getToolName } from "ai"
import type { UIMessage } from "ai"
import { MealPlanCard } from "@/components/meal-plan/MealPlanCard"
import { ShoppingListCard } from "@/components/meal-plan/ShoppingListCard"
import type { MealPlan } from "@/server/services/meal-plan"
import type { ShoppingList } from "@/server/services/shopping-list"

type Props = {
  messages: UIMessage[]
}

/** generateMealPlan ツールの出力構造 */
type MealPlanToolOutput = {
  mealPlan: MealPlan
  shoppingList: ShoppingList
  dayNote: string | null
  violationNote: string | null
}

/** reviseMealPlan ツールの出力構造 */
type RevisionToolOutput = {
  updatedMealPlan: MealPlan
  updatedShoppingList: ShoppingList
  preferenceNote: string | null
  violationNote: string | null
}

function TextBubble({ text, role }: { text: string; role: UIMessage["role"] }) {
  return (
    <div
      className={`flex ${role === "user" ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 text-sm whitespace-pre-wrap ${
          role === "user"
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {text}
      </div>
    </div>
  )
}

export function MessageList({ messages }: Props) {
  if (messages.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-muted-foreground">
        在庫を伝えて、献立と買い物リストを作りましょう。
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
      {messages.map((message) => (
        <div key={message.id} className="flex flex-col gap-3">
          {message.parts.map((part, index) => {
            if (isTextUIPart(part)) {
              if (!part.text) return null
              return (
                <TextBubble key={index} text={part.text} role={message.role} />
              )
            }

            // 献立生成ツールの結果を献立カード・買い物リストとして描画する
            if (
              isToolUIPart(part) &&
              getToolName(part) === "generateMealPlan" &&
              part.state === "output-available"
            ) {
              const output = part.output as MealPlanToolOutput
              return (
                <div key={index} className="flex flex-col gap-3">
                  {output.dayNote && (
                    <p className="text-xs text-muted-foreground">
                      {output.dayNote}
                    </p>
                  )}
                  {output.violationNote && (
                    <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                      ⚠️ {output.violationNote}
                    </p>
                  )}
                  <MealPlanCard mealPlan={output.mealPlan} />
                  <ShoppingListCard shoppingList={output.shoppingList} />
                </div>
              )
            }

            // 献立変更ツールの結果を更新後の献立カードとして描画する
            if (
              isToolUIPart(part) &&
              getToolName(part) === "reviseMealPlan" &&
              part.state === "output-available"
            ) {
              const output = part.output as RevisionToolOutput
              return (
                <div key={index} className="flex flex-col gap-3">
                  {output.violationNote && (
                    <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-700">
                      ⚠️ {output.violationNote}
                    </p>
                  )}
                  <MealPlanCard mealPlan={output.updatedMealPlan} />
                  <ShoppingListCard shoppingList={output.updatedShoppingList} />
                </div>
              )
            }

            return null
          })}
        </div>
      ))}
    </div>
  )
}

import type { ShoppingList } from "@/server/services/shopping-list"

type Props = {
  shoppingList: ShoppingList
}

export function ShoppingListCard({ shoppingList }: Props) {
  return (
    <div className="rounded-lg border bg-background p-3 text-sm">
      <p className="font-medium">買い物リスト（不足分）</p>
      {shoppingList.items.length === 0 ? (
        <p className="text-muted-foreground mt-2 text-xs">
          手持ちで足りるため、買い足しは不要です。
        </p>
      ) : (
        <ul className="mt-2 space-y-0.5 text-xs">
          {shoppingList.items.map((item) => (
            <li key={item.name} className="flex justify-between gap-2">
              <span>{item.name}</span>
              {item.amount && (
                <span className="text-muted-foreground">{item.amount}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

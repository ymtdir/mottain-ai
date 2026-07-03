import { db } from "../db/client"
import { dietaryConstraints } from "../db/schema"
import { eq } from "drizzle-orm"
import { FIXED_USER_ID } from "../agent/context"
import type { AvoidanceItem } from "./avoidance-guard"

export type { AvoidanceItem }

export async function getConstraints(): Promise<AvoidanceItem[]> {
  const row = await db.query.dietaryConstraints.findFirst({
    where: eq(dietaryConstraints.userId, FIXED_USER_ID),
  })
  return (row?.items ?? []) as AvoidanceItem[]
}

export async function upsertConstraints(
  items: AvoidanceItem[],
): Promise<void> {
  const existing = await db.query.dietaryConstraints.findFirst({
    where: eq(dietaryConstraints.userId, FIXED_USER_ID),
  })

  if (existing) {
    await db
      .update(dietaryConstraints)
      .set({ items, updatedAt: new Date() })
      .where(eq(dietaryConstraints.userId, FIXED_USER_ID))
  } else {
    await db.insert(dietaryConstraints).values({
      userId: FIXED_USER_ID,
      items,
    })
  }
}

export async function addConstraint(item: AvoidanceItem): Promise<void> {
  const current = await getConstraints()
  const deduped = current.filter((c) => c.name !== item.name)
  await upsertConstraints([...deduped, item])
}

export async function removeConstraint(name: string): Promise<void> {
  const current = await getConstraints()
  await upsertConstraints(current.filter((c) => c.name !== name))
}

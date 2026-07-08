import { db } from "./client"
import { users } from "./schema"
import { FIXED_USER_ID } from "./constants"

export async function ensureUser(): Promise<void> {
  const name = process.env.DEMO_NAME ?? null
  await db
    .insert(users)
    .values({ id: FIXED_USER_ID, name })
    .onConflictDoUpdate({ target: users.id, set: { name } })
}

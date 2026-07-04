import { db } from "./client"
import { users } from "./schema"
import { FIXED_USER_ID } from "./constants"

export async function ensureUser(): Promise<void> {
  await db.insert(users).values({ id: FIXED_USER_ID }).onConflictDoNothing()
}

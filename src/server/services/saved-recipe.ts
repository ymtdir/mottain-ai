import { db } from "../db/client"
import { savedRecipes } from "../db/schema"
import { eq, and, desc } from "drizzle-orm"
import { FIXED_USER_ID } from "../db/constants"
import { ensureUser } from "../db/ensure-user"

export type IllustrationStatus = "pending" | "generating" | "ready" | "failed"

export type SavedRecipeContent = {
  title: string
  ingredients: { name: string; amount: string | null }[]
  steps: string[]
  notes: string | null
}

export type SavedRecipeListItem = {
  id: string
  normalizedTitle: string
  content: SavedRecipeContent
  illustrationStatus: IllustrationStatus
  illustrationMime: string | null
  illustrationError: string | null
  createdAt: Date
  updatedAt: Date
}

export function normalizeTitle(title: string): string {
  return title.trim().replace(/\s+/g, " ")
}

export function validateContent(
  content: SavedRecipeContent
): { valid: true } | { valid: false; reason: string } {
  if (!content.title || normalizeTitle(content.title) === "") {
    return { valid: false, reason: "タイトルが空です" }
  }
  return { valid: true }
}

type SavedRecipeRow = typeof savedRecipes.$inferSelect

export function toListItem(row: SavedRecipeRow): SavedRecipeListItem {
  return {
    id: row.id,
    normalizedTitle: row.normalizedTitle,
    content: row.content as SavedRecipeContent,
    illustrationStatus: row.illustrationStatus as IllustrationStatus,
    illustrationMime: row.illustrationMime,
    illustrationError: row.illustrationError,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function listSavedRecipes(): Promise<SavedRecipeListItem[]> {
  await ensureUser()
  const rows = await db
    .select({
      id: savedRecipes.id,
      normalizedTitle: savedRecipes.normalizedTitle,
      content: savedRecipes.content,
      illustrationStatus: savedRecipes.illustrationStatus,
      illustrationMime: savedRecipes.illustrationMime,
      illustrationError: savedRecipes.illustrationError,
      createdAt: savedRecipes.createdAt,
      updatedAt: savedRecipes.updatedAt,
    })
    .from(savedRecipes)
    .where(eq(savedRecipes.userId, FIXED_USER_ID))
    .orderBy(desc(savedRecipes.createdAt))
  return rows.map((row) => ({
    ...row,
    content: row.content as SavedRecipeContent,
    illustrationStatus: row.illustrationStatus as IllustrationStatus,
  }))
}

export async function registerRecipe(
  content: SavedRecipeContent
): Promise<SavedRecipeListItem> {
  const validation = validateContent(content)
  if (!validation.valid) throw new Error(validation.reason)

  await ensureUser()
  const normTitle = normalizeTitle(content.title)

  const insertResult = await db
    .insert(savedRecipes)
    .values({
      userId: FIXED_USER_ID,
      normalizedTitle: normTitle,
      content,
      illustrationStatus: "pending",
    })
    .onConflictDoNothing()
    .returning()

  if (insertResult.length > 0) return toListItem(insertResult[0])

  const existing = await db
    .select()
    .from(savedRecipes)
    .where(
      and(
        eq(savedRecipes.userId, FIXED_USER_ID),
        eq(savedRecipes.normalizedTitle, normTitle)
      )
    )
    .limit(1)

  return toListItem(existing[0])
}

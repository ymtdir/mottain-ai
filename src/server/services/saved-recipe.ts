import { db } from "../db/client"
import { savedRecipes } from "../db/schema"
import { eq, and, or, lt, inArray, desc } from "drizzle-orm"
import { FIXED_USER_ID } from "../db/constants"
import { ensureUser } from "../db/ensure-user"
import { generateIllustration } from "./illustration"

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

// ---- イラスト生成の状態遷移（US3 / INV-3） ----

/**
 * `generating` を「処理中を主張するリース」とみなす期限。updatedAt からこの時間を
 * 超えた `generating` は中断された（stale）と判定し、再キック対象にする（永久固定を防ぐ）。
 */
export const ILLUSTRATION_LEASE_MS = 2 * 60 * 1000

/** stale な（＝リース期限切れの）`generating` かを判定する純関数 */
export function isStaleGenerating(
  status: IllustrationStatus,
  updatedAt: Date,
  now: Date,
  leaseMs: number = ILLUSTRATION_LEASE_MS
): boolean {
  return (
    status === "generating" && now.getTime() - updatedAt.getTime() > leaseMs
  )
}

/**
 * 生成を（再）開始すべきかを判定する純関数（INV-3）。
 * - `pending` / `failed` → 開始する
 * - stale な `generating` → 再キックする
 * - 非 stale の `generating` / `ready` → 何もしない（冪等・二重生成を防ぐ）
 */
export function shouldStartIllustration(
  status: IllustrationStatus,
  updatedAt: Date,
  now: Date,
  leaseMs: number = ILLUSTRATION_LEASE_MS
): boolean {
  if (status === "pending" || status === "failed") return true
  return isStaleGenerating(status, updatedAt, now, leaseMs)
}

/**
 * イラスト生成の発火・再試行（FR-012 / FR-015）。冪等。
 * 非 stale の `generating` 中は何もしないが、`pending` / `failed` / stale な `generating`
 * に対しては generating をアトミックにクレームして（再）生成する。
 * 生成はこのリクエスト内で実行する（Cloud Run で CPU が割り当たる文脈・ADR-13）。
 */
export async function ensureIllustration(id: string): Promise<void> {
  const now = new Date()
  const staleThreshold = new Date(now.getTime() - ILLUSTRATION_LEASE_MS)

  // generating をアトミックにクレーム。WHERE で冪等・stale 再キックを一括表現する
  const claimed = await db
    .update(savedRecipes)
    .set({ illustrationStatus: "generating", updatedAt: now })
    .where(
      and(
        eq(savedRecipes.id, id),
        eq(savedRecipes.userId, FIXED_USER_ID),
        or(
          inArray(savedRecipes.illustrationStatus, ["pending", "failed"]),
          and(
            eq(savedRecipes.illustrationStatus, "generating"),
            lt(savedRecipes.updatedAt, staleThreshold)
          )
        )
      )
    )
    .returning({ id: savedRecipes.id, content: savedRecipes.content })

  // ready / 非 stale の generating / 不在 → クレームできず何もしない
  if (claimed.length === 0) return

  const content = claimed[0].content as SavedRecipeContent

  try {
    const { data, mime } = await generateIllustration(content)
    await db
      .update(savedRecipes)
      .set({
        illustrationStatus: "ready",
        illustrationData: data,
        illustrationMime: mime,
        illustrationError: null,
        updatedAt: new Date(),
      })
      .where(and(eq(savedRecipes.id, id), eq(savedRecipes.updatedAt, now)))
  } catch (e) {
    const msg = e instanceof Error ? e.message : "イラスト生成に失敗しました"
    await db
      .update(savedRecipes)
      .set({
        illustrationStatus: "failed",
        illustrationError: msg,
        updatedAt: new Date(),
      })
      .where(and(eq(savedRecipes.id, id), eq(savedRecipes.updatedAt, now)))
  }
}

/** 保存レシピを削除する（FR-010）。存在しない ID は no-op */
export async function deleteRecipe(id: string): Promise<void> {
  await db
    .delete(savedRecipes)
    .where(and(eq(savedRecipes.id, id), eq(savedRecipes.userId, FIXED_USER_ID)))
}

/** `ready` のときのみ画像バイトと MIME を返す（配信用）。それ以外は null */
export async function getIllustration(
  id: string
): Promise<{ data: Buffer; mime: string } | null> {
  const rows = await db
    .select({
      status: savedRecipes.illustrationStatus,
      data: savedRecipes.illustrationData,
      mime: savedRecipes.illustrationMime,
    })
    .from(savedRecipes)
    .where(and(eq(savedRecipes.id, id), eq(savedRecipes.userId, FIXED_USER_ID)))
    .limit(1)

  if (rows.length === 0) return null
  const row = rows[0]
  if (row.status !== "ready" || !row.data) return null
  return { data: row.data, mime: row.mime ?? "image/png" }
}

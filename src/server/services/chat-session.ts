import { db } from "../db/client"
import { chatSessions, chatMessages, users } from "../db/schema"
import { eq, asc, desc } from "drizzle-orm"
import { FIXED_USER_ID } from "../db/constants"
import type { UIMessage } from "ai"

async function ensureUser(): Promise<void> {
  await db.insert(users).values({ id: FIXED_USER_ID }).onConflictDoNothing()
}

export type ChatSession = {
  id: string
  name: string
  createdAt: Date
  updatedAt: Date
}

export async function listSessions(): Promise<ChatSession[]> {
  const rows = await db
    .select()
    .from(chatSessions)
    .where(eq(chatSessions.userId, FIXED_USER_ID))
    .orderBy(desc(chatSessions.updatedAt))
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
  }))
}

export async function createSession(name?: string): Promise<ChatSession> {
  await ensureUser()
  const [row] = await db
    .insert(chatSessions)
    .values({ userId: FIXED_USER_ID, name: name ?? "新しい会話" })
    .returning()
  return {
    id: row.id,
    name: row.name,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

export async function renameSession(id: string, name: string): Promise<void> {
  await db
    .update(chatSessions)
    .set({ name, updatedAt: new Date() })
    .where(eq(chatSessions.id, id))
}

export async function deleteSession(id: string): Promise<void> {
  await db.delete(chatSessions).where(eq(chatSessions.id, id))
}

export async function getMessages(sessionId: string): Promise<UIMessage[]> {
  const rows = await db
    .select()
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, sessionId))
    .orderBy(asc(chatMessages.createdAt))
  return rows.map((r) => ({
    id: r.id,
    role: r.role as UIMessage["role"],
    parts: r.parts as UIMessage["parts"],
  }))
}

export async function saveMessages(
  sessionId: string,
  messages: UIMessage[]
): Promise<void> {
  if (messages.length === 0) return
  await db
    .update(chatSessions)
    .set({ updatedAt: new Date() })
    .where(eq(chatSessions.id, sessionId))
  for (const msg of messages) {
    await db
      .insert(chatMessages)
      .values({
        id: msg.id,
        sessionId,
        role: msg.role,
        parts: msg.parts as object,
      })
      .onConflictDoNothing()
  }
}

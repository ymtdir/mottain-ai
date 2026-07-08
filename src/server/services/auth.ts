import { createHmac, timingSafeEqual } from "node:crypto"
import { FIXED_USER_ID } from "../db/constants"

export const SESSION_COOKIE = "mottain_session"
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000 // 7日

function secret(): string {
  return process.env.SESSION_SECRET ?? "dev-secret-change-in-production"
}

function demoEmail(): string {
  return process.env.DEMO_EMAIL ?? ""
}

function demoPassword(): string {
  return process.env.DEMO_PASSWORD ?? ""
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ba.length !== bb.length) return false
  return timingSafeEqual(ba, bb)
}

function hmac(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url")
}

export function createSessionToken(): string {
  const payload = Buffer.from(
    JSON.stringify({ userId: FIXED_USER_ID, exp: Date.now() + SESSION_TTL_MS })
  ).toString("base64url")
  return `${payload}.${hmac(payload)}`
}

export function verifySessionToken(token: string): boolean {
  const dot = token.lastIndexOf(".")
  if (dot === -1) return false
  const payload = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  try {
    const expected = hmac(payload)
    if (!safeEqual(sig, expected)) return false
    const data = JSON.parse(Buffer.from(payload, "base64url").toString())
    return typeof data.exp === "number" && Date.now() < data.exp
  } catch {
    return false
  }
}

export function getSessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null
  const entry = cookieHeader
    .split(";")
    .map((c) => c.trim())
    .find((c) => c.startsWith(`${SESSION_COOKIE}=`))
  return entry ? entry.slice(SESSION_COOKIE.length + 1) : null
}

export function verifyCredentials(email: string, password: string): boolean {
  const de = demoEmail()
  const dp = demoPassword()
  if (!de || !dp) return false
  try {
    return safeEqual(email, de) && safeEqual(password, dp)
  } catch {
    return false
  }
}

export function makeSetCookieHeader(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}`
}

export function makeClearCookieHeader(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`
}

import { createFileRoute, useRouter, redirect } from "@tanstack/react-router"
import { useState } from "react"
import type { FormEvent } from "react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { checkAuthFn } from "../server/services/auth-check"

export const Route = createFileRoute("/login")({
  beforeLoad: async () => {
    const { authenticated } = await checkAuthFn()
    if (authenticated) throw redirect({ to: "/" })
  },
  component: LoginPage,
})

function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      })
      if (!res.ok) {
        const data = await res.json()
        setError(data.error ?? "ログインに失敗しました")
        return
      }
      await router.navigate({ to: "/" })
    } catch {
      setError("通信エラーが発生しました。もう一度お試しください。")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm">
        {/* ロゴ */}
        <div className="mb-8 flex flex-col items-center gap-2">
          <img src="/favicon.ico" alt="MottainAI" className="size-10" />
          <h1 className="font-[family-name:var(--font-display)] text-2xl font-bold tracking-wide text-foreground">
            MottainAI
          </h1>
          <p className="text-sm text-muted-foreground">
            食材を使い切る献立エージェント
          </p>
        </div>

        {/* カード */}
        <div className="rounded-xl border border-border bg-card p-8 shadow-sm">
          <h2 className="mb-6 text-center text-base font-semibold text-foreground">
            ログイン
          </h2>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">メールアドレス</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="guest@example.com"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">パスワード</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
              />
            </div>

            {error && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </p>
            )}

            <Button type="submit" disabled={loading} className="mt-1 w-full">
              {loading ? "ログイン中..." : "ログイン"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}

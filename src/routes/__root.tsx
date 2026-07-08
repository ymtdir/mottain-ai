import { HeadContent, Scripts, createRootRoute, redirect } from "@tanstack/react-router"
import { TooltipProvider } from "@/components/ui/tooltip"
import { Toaster } from "sonner"
import { checkAuthFn } from "../server/services/auth-check"

import appCss from "../styles.css?url"

export const Route = createRootRoute({
  beforeLoad: async ({ location }) => {
    if (location.pathname.startsWith("/login")) return
    const { authenticated } = await checkAuthFn()
    if (!authenticated) throw redirect({ to: "/login" })
  },
  head: () => ({
    meta: [
      {
        charSet: "utf-8",
      },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1",
      },
      {
        title: "MottainAI",
      },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      {
        rel: "icon",
        href: "/favicon.ico",
        type: "image/x-icon",
      },
    ],
  }),
  notFoundComponent: () => (
    <main className="container mx-auto p-4 pt-16">
      <h1>404</h1>
      <p>The requested page could not be found.</p>
    </main>
  ),
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <head>
        <HeadContent />
      </head>
      <body>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster richColors position="bottom-right" />
        <Scripts />
      </body>
    </html>
  )
}

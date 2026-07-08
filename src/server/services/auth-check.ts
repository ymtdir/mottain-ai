import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { getSessionToken, verifySessionToken } from "./auth"

export const checkAuthFn = createServerFn().handler(async () => {
  const request = getRequest()
  const cookie = request.headers.get("cookie")
  const token = getSessionToken(cookie)
  return { authenticated: token ? verifySessionToken(token) : false }
})

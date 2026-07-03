// @tanstack/react-start/api is a virtual module handled by the Vinxi/Vite plugin
declare module "@tanstack/react-start/api" {
  export function createAPIFileRoute(
    path: string
  ): (handlers: {
    GET?: (ctx: { request: Request }) => Response | Promise<Response>
    POST?: (ctx: { request: Request }) => Response | Promise<Response>
    PUT?: (ctx: { request: Request }) => Response | Promise<Response>
    DELETE?: (ctx: { request: Request }) => Response | Promise<Response>
    PATCH?: (ctx: { request: Request }) => Response | Promise<Response>
  }) => void
}

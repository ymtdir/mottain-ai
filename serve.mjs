import { serve } from "srvx";
import { serveStatic } from "srvx/static";
import handler from "./dist/server/server.js";

serve({
  // /assets などの静的ファイルを先に解決し、なければ SSR ハンドラに渡す
  middleware: [serveStatic({ dir: "./dist/client" })],
  fetch: handler.fetch,
  port: parseInt(process.env.PORT ?? "8080"),
  hostname: "0.0.0.0",
});

import { serve } from "srvx";
import handler from "./dist/server/server.js";

serve({
  fetch: handler.fetch,
  port: parseInt(process.env.PORT ?? "8080"),
  hostname: "0.0.0.0",
});

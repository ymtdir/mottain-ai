import { drizzle } from "drizzle-orm/postgres-js"
import postgres from "postgres"
import * as schema from "./schema"

// DB_SOCKET_PATH があれば接続先を Cloud SQL の unix ソケットに差し替える（Cloud Run 用）。
// postgres.js は URL クエリの ?host= を解釈しないため、オプション引数で上書きする。
const client = postgres(
  process.env.DATABASE_URL!,
  process.env.DB_SOCKET_PATH ? { host: process.env.DB_SOCKET_PATH } : {}
)

export const db = drizzle(client, { schema })

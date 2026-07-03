import { db } from "../db/client";
import { dietaryConstraints, preferenceProfiles } from "../db/schema";
import { eq } from "drizzle-orm";

// MVP 固定ユーザー ID（認証なし）
export const FIXED_USER_ID = "00000000-0000-0000-0000-000000000001";

export type UserContext = {
  avoidanceItems: Array<{ name: string; aliases: string[]; type: "allergy" | "dislike" }>;
  preferenceMemory: Record<string, unknown>;
};

export async function loadUserContext(): Promise<UserContext> {
  const [constraint, preference] = await Promise.all([
    db.query.dietaryConstraints.findFirst({ where: eq(dietaryConstraints.userId, FIXED_USER_ID) }),
    db.query.preferenceProfiles.findFirst({ where: eq(preferenceProfiles.userId, FIXED_USER_ID) }),
  ]);

  return {
    avoidanceItems: (constraint?.items ?? []) as UserContext["avoidanceItems"],
    preferenceMemory: (preference?.memory ?? {}) as Record<string, unknown>,
  };
}

export function buildSystemPrompt(ctx: UserContext): string {
  const parts: string[] = [
    "あなたは献立エージェントです。ユーザーが伝えた在庫を使い切ることを優先し、N日分の夕食献立と不足食材の買い物リストを提案します。",
  ];

  if (ctx.avoidanceItems.length > 0) {
    const list = ctx.avoidanceItems
      .map((i) => `${i.name}（${i.type === "allergy" ? "アレルギー" : "苦手"}）`)
      .join("、");
    parts.push(
      `\n## 絶対に使用禁止の食材（ハード制約・例外なし）\n${list}\n上記は献立・買い物リストのいずれにも含めないでください。回避すると成立しない場合は混入させず、その旨と代替案を伝えてください。`,
    );
  }

  if (Object.keys(ctx.preferenceMemory).length > 0) {
    parts.push(
      `\n## ユーザーの好み（ソフト・可能な範囲で反映）\n${JSON.stringify(ctx.preferenceMemory, null, 2)}`,
    );
  }

  return parts.join("\n");
}

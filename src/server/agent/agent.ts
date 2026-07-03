import { streamText, stepCountIs } from "ai"
import type { ModelMessage } from "ai"
import { geminiFlash } from "../model/gemini"
import { buildSystemPrompt, loadUserContext } from "./context"
import { interpretInventoryTool } from "./tools/interpret-inventory"
import { generateMealPlanTool } from "./tools/generate-meal-plan"

/** ツールの使い方をエージェントに指示する運用プロンプト（US1） */
const OPERATION_INSTRUCTIONS = `
## 進め方
1. ユーザーが手持ち食材を伝えたら、interpretInventory ツールで在庫を構造化し、読み取った内容を簡潔に確認する。
2. 献立の希望日数が不明なら尋ねる。在庫と日数が揃ったら generateMealPlan ツールで献立と買い物リストを生成する。
3. 生成後は、献立の要点（日ごとの料理名）と、買い物リストが「不足分だけ」であることを自然な日本語で伝える。dayNote があればそれも伝える。
4. 在庫が曖昧・不足していても、確認の質問をするか合理的な前提を置いて進める。`

export async function runAgent(messages: ModelMessage[]) {
  const ctx = await loadUserContext()
  const systemPrompt = `${buildSystemPrompt(ctx)}\n${OPERATION_INSTRUCTIONS}`

  return streamText({
    model: geminiFlash(),
    system: systemPrompt,
    messages,
    tools: {
      interpretInventory: interpretInventoryTool,
      generateMealPlan: generateMealPlanTool,
    },
    // ツール呼び出し後にモデルが応答を続けられるよう複数ステップを許可する
    stopWhen: stepCountIs(5),
  })
}

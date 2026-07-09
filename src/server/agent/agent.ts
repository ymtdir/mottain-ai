import { streamText, stepCountIs } from "ai"
import type { ModelMessage } from "ai"
import { geminiFlash } from "../model/gemini"
import { buildSystemPrompt, loadUserContext } from "./context"
import { interpretInventoryTool } from "./tools/interpret-inventory"
import { generateMealPlanTool } from "./tools/generate-meal-plan"
import { updateConstraintsTool } from "./tools/update-constraints"
import { reviseMealPlanTool } from "./tools/revise-meal-plan"
import { learnPreferenceTool } from "./tools/learn-preference"
import { recordMealPlanTool } from "./tools/record-meal-plan"

/** ツールの使い方をエージェントに指示する運用プロンプト（US1〜US4） */
const OPERATION_INSTRUCTIONS = `
## 進め方
1. ユーザーが手持ち食材を伝えたら、interpretInventory ツールで在庫を構造化し、読み取った内容を簡潔に確認する。
2. 献立の希望日数が不明なら尋ねる。在庫と日数が揃ったら generateMealPlan ツールで献立と買い物リストを生成する。
3. 生成後は、献立と買い物リストは画面に表示されるため内容を繰り返さない。「作成しました」の一言と、dayNote がある場合のみその内容を添える。最後に必ず「この献立を確定してよいですか？」と聞いて、ユーザーの承認を促す。これが会話のゴールである。
4. violationNote がある場合のみ、回避できなかった旨と代替案を丁寧に伝える。それ以外の場合は violationNote に言及しない。
5. ユーザーがアレルギー・苦手食材を伝えたら、updateConstraints ツールで登録する（add / remove / replace）。
6. ユーザーが献立の変更を依頼したら（「○日目を魚料理に」「もっと簡単に」など）、reviseMealPlan ツールで対象日だけを差し替える。変更理由に好み（「辛いのが苦手」など）が含まれていれば preferenceNote に抽出して渡す。
7. ユーザーが好み・味の感想を述べたら（「辛いのが苦手」「この生姜焼きはしょっぱかった」など）、learnPreference ツールで記録する。抽象的な感想も具体調整に翻訳して永続化する。
8. ユーザーが確定の意思をはっきり示したら（「はい」「OK」「これで作ります」「確定して」など）、recordMealPlan ツールで食事カレンダーに記録する。承認された献立の全料理を meals に渡す。修正依頼・曖昧な返答・「どうしようかな」といった迷いの言葉では呼ばない。記録後は「カレンダーに記録しました」と簡潔に伝える。
   - **重要**: 同じ料理が複数日にわたる場合でも、各 meal に title・ingredients・steps・notes を必ず完全にコピーして渡すこと。繰り返し日だからといって ingredients や steps を空配列にしてはならない。
   - recordMealPlan が conflicts を返した場合は、衝突している各日付について「X月Y日は既に「既存料理名」が記録されています。新しい「新料理名」に上書きしますか？」とユーザーに確認する。ユーザーが上書きを選んだ日付を overwriteDates に指定して recordMealPlan を再度呼ぶ。上書きしない日付はスキップする。

## 曖昧・不完全な入力の扱い方（FR-026）
- 食材名が不明瞭（「お肉」「野菜」など）: 一般的な代表食材（「鶏肉」「キャベツ」など）を前提に置き、「○○として扱いました」のように明示する。
- 数量が不明: 「少量（1〜2人分程度）」と前提を置いて進める。
- 日数が指定されていない: 「何日分の献立を作りますか？（1〜7日）」と一度だけ尋ねる。
- 要求が複数同時（「変更したい＋感想も伝えたい」など）: 変更→感想の順にツールを呼び、一度の応答でまとめて処理する。
- 会話が続いても前の在庫・献立の情報は文脈から参照し、ユーザーに再入力を求めない（FR-025）。`

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
      updateConstraints: updateConstraintsTool,
      reviseMealPlan: reviseMealPlanTool,
      learnPreference: learnPreferenceTool,
      recordMealPlan: recordMealPlanTool,
    },
    // ツール呼び出し後にモデルが応答を続けられるよう複数ステップを許可する
    stopWhen: stepCountIs(5),
  })
}

---

description: "Task list for 献立コア（在庫→献立・買い物リスト＋回避＋対話変更＋好み学習）"
---

# Tasks: 献立コア（在庫→献立・買い物リスト＋回避＋対話変更＋好み学習）

**Input**: 設計ドキュメント `specs/001-meal-plan-core/`（plan.md / spec.md / research.md / data-model.md / quickstart.md）

**前提**: 技術スタックは ADR-04〜11 で確定（TanStack Start / Vercel AI SDK / Gemini / Drizzle+postgres.js / pnpm+Node / shadcn+Tailwind / ESLint+Prettier+Vitest）。TanStack Start・shadcn・CI の scaffold は別ブランチ（PR #7）で導入済みの想定。本タスクはその上に機能を積む。

**テスト方針**: 全面 TDD ではなく、越えてはならない不変条件（INV-1 回避0%＝SC-001、INV-2 買い物リストは不足分のみ＝SC-002、好み反映）に絞って Vitest（単体・統合）を書く。

**構成**: タスクはユーザーストーリー単位。段階順は「チャット疎通（Foundational）→ US1 → US2 → US3 → US4」。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可（別ファイル・依存なし）
- **[Story]**: 対応するユーザーストーリー（US1〜US4）。Setup / Foundational / Polish は付けない
- ファイルパスを明記

---

## Phase 1: Setup（共有基盤）

**Purpose**: 機能実装に必要な依存・設定・ディレクトリを整える

- [ ] T001 Vercel AI SDK（`ai`・Google/Gemini プロバイダ）・Drizzle（`drizzle-orm`・`drizzle-kit`）・`postgres`・`zod` を依存追加（package.json）
- [ ] T002 [P] Drizzle 設定を追加（drizzle.config.ts：スキーマパス・出力先・接続情報）
- [ ] T003 [P] 環境変数テンプレートを追加（.env.example：Gemini 資格情報・`DATABASE_URL`）
- [ ] T004 [P] サーバー層のディレクトリ構成を作成（src/server/{agent,agent/tools,services,db,model,lib}）
- [ ] T005 [P] `db:generate` / `db:migrate` スクリプトを追加（package.json）

---

## Phase 2: Foundational（ブロッキング前提 — チャット疎通と中核基盤）

**Purpose**: すべての US の前提。ここで「チャットで LLM と往復できる」土台まで通す

**⚠️ CRITICAL**: この Phase 完了まで US の作業は開始できない

- [ ] T006 DB クライアント（postgres.js + Drizzle）を実装（src/server/db/client.ts）
- [ ] T007 Drizzle スキーマ定義：User / DietaryConstraint / PreferenceProfile（src/server/db/schema.ts、data-model.md 準拠）
- [ ] T008 初期マイグレーションを生成・適用（`pnpm db:generate` → `pnpm db:migrate`）
- [ ] T009 [P] Gemini プロバイダのラッパ（タスク別モデル選択）を実装（src/server/model/gemini.ts）
- [ ] T010 [P] エラーハンドリング/ロギング基盤を実装（src/server/lib/errors.ts）
- [ ] T011 ユーザー文脈注入モジュールの骨組み（回避＋好みを合成してコンテキスト化）を実装（src/server/agent/context.ts）
- [ ] T012 Vercel AI SDK の単一エージェント骨組み（ツールループ）を実装（src/server/agent/agent.ts）
- [ ] T013 ストリーミングチャットのサーバー関数を実装（src/routes/api/chat.ts）
- [ ] T014 チャット UI シェル（入力・送信・ストリーミング表示）を実装（src/routes/index.tsx、src/components/chat/）

**Checkpoint**: チャットで LLM と往復できる（段階①疎通の完了）

---

## Phase 3: User Story 1 - チャットで在庫を伝えて N 日分の献立と買い物リストを受け取る (Priority: P1) 🎯 MVP

**Goal**: 在庫の発話から、使い切り優先の N 日分（1〜7日）夕食献立と、不足分だけの買い物リストを返す

**Independent Test**: 在庫＋日数を伝え、(a) 指定日数分の献立、(b) 不足分だけの買い物リスト、(c) 手持ちの使い切り、を確認できる

### Tests for User Story 1

- [ ] T015 [P] [US1] 買い物リストが不足分のみで構成される単体テスト（INV-2/SC-002）（tests/unit/shopping-list.test.ts）
- [ ] T016 [P] [US1] 傷みやすい食材が早い日に配置される単体テスト（tests/unit/perishability.test.ts）
- [ ] T017 [P] [US1] チャット→在庫→献立→買い物リストの統合テスト（tests/integration/us1-meal-plan.test.ts）

### Implementation for User Story 1

- [ ] T018 [P] [US1] 在庫の型と正規化（InventoryItem・日持ち区分の付与）を実装（src/server/services/inventory.ts）
- [ ] T019 [US1] 在庫解釈ツール（発話→構造化在庫、FR-001/002）を実装（src/server/agent/tools/interpret-inventory.ts）
- [ ] T020 [US1] 献立生成サービス（使い切り最適化・日持ち考慮・日数1〜7、FR-007/008/010/011）を実装（src/server/services/meal-plan.ts）
- [ ] T021 [US1] 日数バリデーション（範囲外を上限内に案内、FR-006）を実装（src/server/services/meal-plan.ts）
- [ ] T022 [US1] 買い物リスト算出（献立と在庫の差分＝不足分、FR-009）を実装（src/server/services/shopping-list.ts）
- [ ] T023 [US1] 献立生成ツール（agent tool）を実装（src/server/agent/tools/generate-meal-plan.ts）
- [ ] T024 [US1] 在庫確認・修正のチャット挙動（FR-003）を結線（src/server/agent/agent.ts）
- [ ] T025 [US1] 献立（日別カード）・買い物リストの UI 表示を実装（src/components/meal-plan/）

**Checkpoint**: US1 が独立して動作（MVP）

---

## Phase 4: User Story 2 - アレルギー・苦手食材を絶対に避ける (Priority: P1)

**Goal**: 登録された回避食材を献立・買い物リストに 0% 混入させない（越えてはならない制約）

**Independent Test**: 回避食材を登録して複数回提案し、提案に一切含まれないことを確認できる

### Tests for User Story 2

- [ ] T026 [P] [US2] 回避対象が提案に 0% 混入しない統合テスト（INV-1/SC-001）（tests/integration/us2-avoidance.test.ts）
- [ ] T027 [P] [US2] 回避対象の突き合わせ（別名・正規化）単体テスト（tests/unit/avoidance-check.test.ts）

### Implementation for User Story 2

- [ ] T028 [P] [US2] DietaryConstraint サービス（登録・更新・永続、FR-012/015）を実装（src/server/services/dietary-constraint.ts）
- [ ] T029 [US2] 回避制約更新ツール（agent tool）を実装（src/server/agent/tools/update-constraints.ts）
- [ ] T030 [US2] 回避のコード側最終検証（生成結果を検査し混入時は再生成/ブロック、FR-013）を実装（src/server/services/avoidance-guard.ts）
- [ ] T031 [US2] context.ts に回避制約（ハード）を注入し、生成フローに guard を結線（src/server/agent/context.ts、agent.ts）
- [ ] T032 [US2] 回避で成立不能な場合の代替案応答（FR-014）を実装（src/server/agent/agent.ts）
- [ ] T033 [US2] 回避設定の UI（設定領域で確認・編集）を実装（src/components/settings/）

**Checkpoint**: US1＋US2 が動作。回避 0% を検証済み

---

## Phase 5: User Story 3 - 対話で献立を変更する (Priority: P2)

**Goal**: チャットの変更依頼に応じ、該当を差し替え、買い物リストを整合させる（非対象は崩さない）

**Independent Test**: 変更依頼後、該当が変わり買い物リストが整合、非対象が不必要に変わらないことを確認できる

### Tests for User Story 3

- [ ] T034 [P] [US3] 変更後に買い物リストが更新献立と整合する統合テスト（SC-006）（tests/integration/us3-revision.test.ts）

### Implementation for User Story 3

- [ ] T035 [US3] 献立変更サービス（対象差し替え・非対象保持、FR-016/017）を実装（src/server/services/meal-plan-revise.ts）
- [ ] T036 [US3] 献立変更ツール（変更適用＋買い物リスト再整合）を実装（src/server/agent/tools/revise-meal-plan.ts）
- [ ] T037 [US3] 変更理由に含まれる好みを US4 の学習へ引き渡す結線（FR-016→FR-018）（src/server/agent/agent.ts）
- [ ] T038 [US3] 変更依頼の UI（会話から依頼→反映）を仕上げ（src/components/chat/、meal-plan/）

**Checkpoint**: US1〜US3 が動作

---

## Phase 6: User Story 4 - 会話から好みを学習して反映する (Priority: P3)

**Goal**: 会話の好み・味の感想を捕捉し、全体傾向とレシピ固有調整として永続化、以降の提案へ反映する

**Independent Test**: 好み・味の感想を伝え、(a) 抽象的感想が具体調整に翻訳され次回反映、(b) 永続化され別セッションでも反映、を確認できる

### Tests for User Story 4

- [ ] T039 [P] [US4] 全体傾向（例:「辛いのが苦手」）が次回提案に反映される統合テスト（tests/integration/us4-preference.test.ts）
- [ ] T040 [P] [US4] レシピ固有調整（例:「この生姜焼きはしょっぱい」→次回塩控えめ）が反映される統合テスト（SC-008）（tests/integration/us4-recipe-adjust.test.ts）

### Implementation for User Story 4

- [ ] T041 [P] [US4] PreferenceProfile サービス（好みメモリの read/merge・永続、FR-021）を実装（src/server/services/preference.ts）
- [ ] T042 [US4] 味の感想 解析→具体調整 翻訳ツール（FR-018/019）を実装（src/server/agent/tools/learn-preference.ts）
- [ ] T043 [US4] レシピ固有調整の記憶・生成時適用（FR-020）を実装（src/server/services/preference.ts、meal-plan.ts）
- [ ] T044 [US4] 相反する感想は直近を優先するマージ規則（FR-023）を実装（src/server/services/preference.ts）
- [ ] T045 [US4] context.ts に好みメモリ（ソフト）を注入し、回避優先（FR-024）を維持（src/server/agent/context.ts）
- [ ] T046 [US4] 学習不足時の無難フォールバック（FR-022）を実装（src/server/services/meal-plan.ts）

**Checkpoint**: 全 US が動作

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: 全 US にまたがる仕上げ

- [ ] T047 会話文脈保持・曖昧入力ハンドリングの仕上げ（FR-025/026）（src/server/agent/agent.ts）
- [ ] T048 [P] 好みメモリ肥大時の要約・剪定の要否を検討・対応（research R8 未決）（src/server/agent/context.ts）
- [ ] T049 [P] quickstart.md の検証シナリオ S1〜S4 を手動実行
- [ ] T050 Cloud Run 動作確認（Dockerfile ビルド→ローカル起動でチャット疎通）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし。即開始可
- **Foundational (Phase 2)**: Setup 完了に依存。全 US をブロック
- **User Stories (Phase 3〜6)**: Foundational 完了に依存。以降は優先度順（US1→US2→US3→US4）
- **Polish (Phase 7)**: 対象 US 完了に依存

### User Story Dependencies

- **US1 (P1)**: Foundational 後に開始可。他 US に依存しない
- **US2 (P1)**: Foundational 後に開始可。US1 の生成フローに guard を結線するが、回避ロジック単体は独立実装・独立テスト可
- **US3 (P2)**: US1 の献立・買い物リストを前提に変更を行う（US1 完了後が自然）
- **US4 (P3)**: Foundational の context.ts を拡張。US3 と結線するが、学習ロジック単体は独立テスト可

### Within Each User Story

- テスト（不変条件）→ モデル/サービス → ツール → UI → 統合、の順
- サービス（決定的ロジック）を先に固め、エージェントツールから呼ぶ

### Parallel Opportunities

- Setup の [P]（T002/T003/T004/T005）は並列可
- Foundational の [P]（T009/T010）は並列可
- 各 US 内のテスト [P] とモデル/サービス [P] は並列可
- 別 US は担当を分ければ並列可（ただし US3 は US1 前提）

---

## Parallel Example: User Story 1

```bash
# US1 のテストをまとめて起票（不変条件）:
Task: "買い物リストが不足分のみの単体テスト tests/unit/shopping-list.test.ts"
Task: "日持ち順配置の単体テスト tests/unit/perishability.test.ts"
Task: "チャット→献立→買い物リストの統合テスト tests/integration/us1-meal-plan.test.ts"

# US1 の独立サービスをまとめて実装:
Task: "在庫の型と正規化 src/server/services/inventory.ts"
```

---

## Implementation Strategy

### MVP First（US1 まで）

1. Phase 1 Setup を完了
2. Phase 2 Foundational を完了（チャット疎通＝段階①。全 US をブロック）
3. Phase 3 US1 を完了
4. **STOP & VALIDATE**: US1 を独立検証（在庫→献立→買い物リスト）
5. 問題なければデモ/デプロイ

### Incremental Delivery

1. Setup + Foundational → 土台（チャット疎通）
2. US1 → 独立検証 → デモ（MVP！）
3. US2（回避 0% を検証）→ 独立検証 → デモ
4. US3（対話変更）→ 独立検証 → デモ
5. US4（好み学習）→ 独立検証 → デモ

---

## Notes

- [P] は別ファイル・依存なし。[Story] はトレーサビリティ用
- 越えてはならない制約（回避 0%＝SC-001）は US2 の統合テストで担保
- コミットはタスクまたは論理的なまとまりごと（コミット規約に従う）
- 各 Checkpoint で US を独立検証してから次へ

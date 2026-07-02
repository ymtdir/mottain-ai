---
description: "Task list for 食材使い切り献立エージェント"
---

# Tasks: 食材使い切り献立エージェント

**Input**: 設計文書 `specs/001-meal-plan-agent/`（plan.md, spec.md, research.md, data-model.md）

**Tech**: TypeScript / TanStack Start（Router・Query・Vite）/ Vercel AI SDK（Gemini は Gemini Enterprise Agent Platform 経由）/ Cloud SQL for PostgreSQL / Cloud Run（ADR-04〜07）

**Tests**: 原則オプション。安全・正しさが測定対象の US1（買い物リスト＝不足分のみ, SC-002）と US2（アレルゲン混入0%, SC-001）のみ対象テストを含める。

**Organization**: タスクはユーザーストーリー単位のフェーズに分け、各ストーリーを独立して実装・テストできるようにする。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可（別ファイル・依存なし）
- **[Story]**: 対応するユーザーストーリー（US1〜US8）
- 各タスクに具体的なファイルパスを記載

## Path Conventions（plan.md より）

- `src/routes/`（画面）, `src/server/`（サーバー関数・BFF）, `src/server/agent/`（AI SDK エージェント・ツール）, `src/server/services/`（ドメインロジック）, `src/server/db/`（接続・スキーマ）, `src/components/`（UI）, `tests/`（Vitest）

---

## Phase 1: Setup（共有基盤）

**Purpose**: プロジェクト初期化と基本構造

- [ ] T001 plan.md の構成に沿ってディレクトリを作成（`src/routes/`, `src/server/{agent,services,db}/`, `src/components/`, `src/lib/`, `tests/`）
- [ ] T002 TanStack Start（TypeScript）プロジェクトを初期化し依存を導入（TanStack Router/Query・Vite・Vercel AI SDK・Google/Gemini プロバイダ）
- [ ] T003 [P] Lint/Format 設定を追加（`biome.json` もしくは ESLint+Prettier）
- [ ] T004 [P] Node 用 `Dockerfile` を作成し、既存 `app/` の Python プレースホルダ（`app/main.py`・`app/Dockerfile`）を置き換える
- [ ] T005 [P] Vitest 設定を追加（`vitest.config.ts`）

---

## Phase 2: Foundational（ブロッキング前提）

**Purpose**: 全ユーザーストーリーの前提となるコア基盤

**⚠️ CRITICAL**: このフェーズ完了までユーザーストーリー着手不可

- [ ] T006 Cloud SQL(PostgreSQL) 接続と環境設定を `src/server/db/client.ts` に実装（`infra/terraform` の `enable_cloud_sql=true` 前提）
- [ ] T007 マイグレーション基盤を用意し、data-model のリレーショナル＋JSONB 方針でスキーマを定義（`src/server/db/schema.ts`, `src/server/db/migrations/`）
- [ ] T008 [P] Household と Conversation の基盤モデル/テーブルを作成（全ストーリーが依存）（`src/server/db/schema.ts`）
- [ ] T009 [P] Gemini プロバイダ設定とタスク別モデル使い分けの共通ラッパを実装（`src/server/agent/model.ts`）
- [ ] T010 [P] エラーハンドリングとロギングの基盤を用意（`src/server/lib/logger.ts`, `src/server/lib/errors.ts`）
- [ ] T011 チャットのサーバー関数土台（AI SDK の `streamText` とツール実行ループ）と `useChat` 接続の骨組みを実装（`src/server/agent/run.ts`, `src/routes/chat.tsx`）

**Checkpoint**: 基盤完成。ユーザーストーリー着手可能

---

## Phase 3: User Story 1 - チャットで在庫→N日分献立と買い物リスト (Priority: P1) 🎯 MVP

**Goal**: 在庫と日数をチャットで伝えると、手持ちを使い切る N 日分（1〜7日）の夕食献立と、不足分だけの買い物リストが返る。

**Independent Test**: 在庫と「3日分」を伝え、(a) 3日分の献立、(b) 買い物リストが不足分のみ、(c) 手持ち食材が期間内で使われる、を確認。

### Tests for User Story 1

- [ ] T012 [P] [US1] 買い物リストが「必要量−手持ち量」の不足分のみになる（INV-2/SC-002）単体テストを `tests/shopping-list.test.ts` に追加

### Implementation for User Story 1

- [ ] T013 [P] [US1] InventoryItem モデル/テーブルを追加（`src/server/db/schema.ts`）
- [ ] T014 [P] [US1] MealPlan・Recipe・ShoppingList モデル/テーブルを追加（`src/server/db/schema.ts`）
- [ ] T015 [US1] 在庫解釈ツール（自由発話→在庫の構造化）を実装（`src/server/agent/tools/parse-inventory.ts`）
- [ ] T016 [US1] 献立計画ツール（使い切り最適化・夕食1食・1〜7日）を実装（`src/server/agent/tools/plan-meals.ts`）
- [ ] T017 [US1] 買い物リスト生成（手持ちとの差分＝不足分のみ）を実装（`src/server/services/shopping-list.ts`）
- [ ] T018 [US1] 在庫の確認・修正チャットフロー（追加/削除/数量調整）を実装（`src/server/agent/tools/edit-inventory.ts`）
- [ ] T019 [US1] 日数指定のバリデーション（1〜7、範囲外は上限内へ案内 FR-031）を実装（`src/server/services/plan-request.ts`）
- [ ] T020 [US1] チャット・献立表示・買い物リストの UI を実装（`src/components/Chat.tsx`, `src/components/MealPlanView.tsx`, `src/components/ShoppingList.tsx`）

**Checkpoint**: US1 が単独で機能・テスト可能（回避制約なしの状態で）

---

## Phase 4: User Story 2 - アレルギー・苦手食材を絶対に避ける (Priority: P1)

**Goal**: 登録したアレルギー・苦手食材を、いかなる提案（献立・買い物リスト・イラスト）にも混入させない。

**Independent Test**: 回避食材を登録し複数回提案・修正しても、提案に一切含まれないことを確認。

### Tests for User Story 2

- [ ] T021 [P] [US2] 登録済み回避食材が提案に混入しない（INV-1/SC-001=0%）単体テストを `tests/guardrail.test.ts` に追加

### Implementation for User Story 2

- [ ] T022 [P] [US2] DietaryConstraint を JSONB で保存するモデルを追加（`src/server/db/schema.ts`）
- [ ] T023 [US2] アレルギー・苦手の登録/更新フローを実装（`src/server/agent/tools/edit-constraints.ts`, `src/components/ConstraintsSettings.tsx`）
- [ ] T024 [US2] 決定的な除外フィルタ（提案・買い物リスト・イラスト生成の直前チェック）を実装し、混入時はブロックして再生成/代替提示（`src/server/services/guardrail.ts`）
- [ ] T025 [US2] 回避で成立しない場合に混入させず旨と代替案を返すロジックを実装（FR-014）（`src/server/services/guardrail.ts`）
- [ ] T026 [US2] エージェントのシステムプロンプトに回避指示を組み込む（`src/server/agent/prompt.ts`）

**Checkpoint**: US1＋US2 がそれぞれ独立して機能

---

## Phase 5: User Story 3 - 世帯人数に合わせた分量 (Priority: P2)

**Goal**: 大人・子供（年齢帯）に応じた分量で献立・買い物数量を出す。人数は後から変更可。

**Independent Test**: 世帯を設定して分量を確認し、人数変更後に分量が変わることを確認。

- [ ] T027 [P] [US3] Household に年齢帯別人数と分量係数を実装（`src/server/db/schema.ts`, `src/server/services/portion.ts`）
- [ ] T028 [US3] 世帯設定の初期設定・変更フローを実装（`src/routes/household.tsx`, `src/server/agent/tools/edit-household.ts`）
- [ ] T029 [US3] 分量・買い物数量への係数適用を献立計画・買い物リスト生成に統合（`src/server/agent/tools/plan-meals.ts`, `src/server/services/shopping-list.ts`）

**Checkpoint**: US1〜US3 が独立して機能

---

## Phase 6: User Story 4 - チャットで提案を修正・改善 (Priority: P2)

**Goal**: 「この日を魚料理に」「もっと簡単に」等の修正をチャットで受け、献立と買い物リストを矛盾なく更新。

**Independent Test**: 修正を依頼し、該当箇所が変更され買い物リストが整合することを確認。

- [ ] T030 [US4] 献立修正ツール（特定日変更・条件変更）を実装（`src/server/agent/tools/revise-plan.ts`）
- [ ] T031 [US4] 修正後の献立と買い物リストの整合更新（INV-2 維持）を実装（`src/server/services/shopping-list.ts`）
- [ ] T032 [US4] 修正 UI（該当日編集・再提案表示）を実装（`src/components/MealPlanView.tsx`）

**Checkpoint**: US1〜US4 が独立して機能

---

## Phase 7: User Story 5 - エージェントの根拠が見える (Priority: P2)

**Goal**: 使い切り対象・回避した制約食材・好み反映を含む根拠を提案ごとに提示。

**Independent Test**: 提案の根拠を開き、使い切り対象・回避食材・好み反映が読み取れることを確認。

- [ ] T033 [P] [US5] Rationale の生成（使い切り対象・回避食材・好み反映）を実装（`src/server/services/rationale.ts`）
- [ ] T034 [US5] 根拠パネル UI（献立に紐づく根拠表示）を実装（`src/components/RationalePanel.tsx`）

**Checkpoint**: US1〜US5 が独立して機能

---

## Phase 8: User Story 6 - 5段階評価と任意コメントで好みを学習 (Priority: P3)

**Goal**: 5段階評価＋任意コメント（味の感想）から、ジャンル傾向と味付けの具体改善を学習し次回に反映。

**Independent Test**: 評価とコメントを付け、(a) 抽象的な味の感想に具体的な改善案、(b) 次回提案への反映、を確認。

- [ ] T035 [P] [US6] Rating（5段階＋任意コメント）モデルを追加（`src/server/db/schema.ts`）
- [ ] T036 [P] [US6] FlavorFeedback・PreferenceProfile を JSONB で保存するモデルを追加（`src/server/db/schema.ts`）
- [ ] T037 [US6] 評価＋任意コメント入力 UI を実装（`src/components/RatingForm.tsx`）
- [ ] T038 [US6] コメントの味の感想→具体改善への翻訳と好み傾向の学習を実装（`src/server/services/learning.ts`）
- [ ] T039 [US6] 好みプロファイルを提案時のプロンプトへ注入（`src/server/agent/prompt.ts`）

**Checkpoint**: US1〜US6 が独立して機能

---

## Phase 9: User Story 7 - 気に入ったレシピを保存 (Priority: P3)

**Goal**: レシピを保存し後から参照できる。

**Independent Test**: レシピを保存し、保存一覧から参照できることを確認。

- [ ] T040 [P] [US7] SavedRecipe モデルを追加（`src/server/db/schema.ts`）
- [ ] T041 [US7] レシピ保存・保存一覧の UI とサーバー関数を実装（`src/routes/saved.tsx`, `src/server/services/saved-recipes.ts`）

**Checkpoint**: US1〜US7 が独立して機能

---

## Phase 10: User Story 8 - レシピのイラストを見る (Priority: P3)

**Goal**: 確定または明示要求時のみイラストを生成し、修正のたびに再生成しない。

**Independent Test**: 修正中は自動生成されず、確定/明示要求で生成・表示されることを確認。

- [ ] T042 [P] [US8] RecipeImage モデルを追加（`src/server/db/schema.ts`）
- [ ] T043 [US8] 画像生成（確定/明示要求時のみ発火、INV-6。生成前に guardrail 通過）を実装（`src/server/services/illustration.ts`）
- [ ] T044 [US8] イラスト表示 UI を実装（`src/components/RecipeImageView.tsx`）

**Checkpoint**: 全ユーザーストーリーが独立して機能

---

## Phase 11: Polish & Cross-Cutting

**Purpose**: 複数ストーリーに跨る改善

- [ ] T045 [P] コスト抑制を横断適用（タスク別モデル使い分け・1リクエストの LLM/画像呼び出し上限・修正ループ中の再生成抑制、research R6）（`src/server/agent/model.ts`, `src/server/agent/run.ts`）
- [ ] T046 [P] README/docs を更新（ローカル実行・環境変数・エージェント構成）（`README.md`）
- [ ] T047 コード整理・リファクタ（重複ロジックの抽出、型の整理）
- [ ] T048 CD（GitHub Actions → Cloud Run）で本アプリのデプロイ疎通を確認（`.github/workflows/deploy.yml`）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし。即着手可
- **Foundational (Phase 2)**: Setup 完了に依存。全ストーリーをブロック
- **User Stories (Phase 3〜10)**: Foundational 完了後に着手可。優先度順（P1→P2→P3）または並列
- **Polish (Phase 11)**: 対象ストーリー完了に依存

### User Story Dependencies

- **US1 (P1)**: Foundational 後に着手可。他ストーリー非依存
- **US2 (P1)**: Foundational 後に着手可。独立テスト可。US1 の提案経路に guardrail（T024）を差し込むと安全性が完成する（US1 は回避制約なしで独立テスト可）
- **US3〜US5 (P2)**: Foundational 後に着手可。US1 の献立/根拠に統合するが独立テスト可
- **US6〜US8 (P3)**: Foundational 後に着手可。US1 のレシピ/評価に紐づくが独立テスト可

### Within Each User Story

- テスト（含む場合）は実装前に失敗させる
- モデル → サービス → サーバー関数/ツール → UI → 統合

### Parallel Opportunities

- Setup の [P]（T003・T004・T005）は並列可
- Foundational の [P]（T008・T009・T010）は並列可
- Foundational 完了後、各ユーザーストーリーは並列着手可
- 各ストーリー内の [P]（別ファイルのモデル等）は並列可

---

## Parallel Example: User Story 1

```bash
# US1 のモデルを並列作成:
Task: "InventoryItem モデルを src/server/db/schema.ts に追加"
Task: "MealPlan・Recipe・ShoppingList モデルを src/server/db/schema.ts に追加"  # 同一ファイルのため実際は直列。別ファイル分割時のみ並列
# US1 のテスト:
Task: "買い物リスト不足分のみの単体テストを tests/shopping-list.test.ts に追加"
```

---

## Implementation Strategy

### MVP First（US1 のみ）

1. Phase 1: Setup
2. Phase 2: Foundational（CRITICAL）
3. Phase 3: US1（在庫→献立＋買い物リスト）
4. **STOP & VALIDATE**: US1 を独立検証
5. 準備できればデプロイ/デモ

### Incremental Delivery

1. Setup ＋ Foundational → 基盤完成
2. US1（P1）→ 独立検証 → デプロイ/デモ（MVP）
3. US2（P1・ガードレール）→ 安全性を確立
4. US3〜US5（P2）→ 実用性向上
5. US6〜US8（P3）→ 学習・保存・イラストで差別化
6. 各ストーリーは前を壊さず価値を追加

---

## Notes

- [P] = 別ファイル・依存なし。同一ファイル（例: `schema.ts`）に集約するモデル群は実際は直列
- [Story] ラベルでタスクとユーザーストーリーを追跡
- 各タスクまたは論理単位ごとにコミット（commit-conventions に従う）
- 各チェックポイントでストーリーを独立検証
- 回避（DietaryConstraint）は使い切り最適化・好み反映より常に優先（INV-7）

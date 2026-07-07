---
description: "Task list for 食事カレンダー（食べた料理の記録・カレンダー閲覧）"
---

# Tasks: 食事カレンダー（食べた料理の記録・カレンダー閲覧）

**Input**: 設計ドキュメント `specs/003-meal-calendar/`（plan.md / spec.md / research.md / data-model.md / quickstart.md）

**前提**: 技術スタックは 001/002 と共通（ADR-04〜11）。本機能は新技術・新 GCP インフラを増やさない。承認検知は既存のエージェント・ツール基盤（ADR-07）にツールを1つ追加して実現する。データモデルは meal_logs のスナップショット保持で、002 の saved_recipes は変更しない（ADR-14）。お気に入り登録は 002 の登録フローを再利用する。新規依存の追加は不要。

**テスト方針**: 全面 TDD ではなく、決定的ロジックに絞って Vitest（コロケーション単体）を書く。対象 = 日付割当（承認日起点・月またぎ）と当月抽出の境界（月初/翌月初）。LLM の承認判断そのもの・E2E は対象外。

**構成**: タスクはユーザーストーリー単位。段階順は「Setup → Foundational（スキーマ＋サービス基盤）→ US1 → US2 → US3 → US4」。MVP は US1＋US2（記録＋カレンダー閲覧、ともに P1）。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可（別ファイル・依存なし）
- **[Story]**: 対応するユーザーストーリー（US1〜US4）。Setup / Foundational / Polish は付けない
- ファイルパスを明記

---

## Phase 1: Setup（共有基盤）

**Purpose**: 機能実装に必要なディレクトリを用意する（新規依存はなし）

- [x] T001 [P] カレンダー UI 用ディレクトリを用意（src/components/calendar/）

---

## Phase 2: Foundational（ブロッキング前提 — スキーマとサービス基盤）

**Purpose**: すべての US の前提。永続化スキーマと食事記録サービスの土台を通す

**⚠️ CRITICAL**: この Phase 完了まで US の作業は開始できない

- [x] T002 Drizzle スキーマに `meal_logs` を追加（src/server/db/schema.ts、data-model.md 準拠：eatenOn(date) / content(JSONB) / userId FK / createdAt / `(userId, eatenOn)` インデックス）
- [x] T003 初期マイグレーションを生成（`pnpm db:generate`）。`db:migrate` の実適用はライブ DB 要のため別ブランチ・最終フェーズに委ねる（002 の T003 と同様）
- [x] T004 MealLog サービスの基盤（型定義・当月抽出 `monthRange("YYYY-MM")`＝[月初, 翌月初)・当月一覧取得・削除）を実装（src/server/services/meal-log.ts）

**Checkpoint**: スキーマとサービス基盤が用意でき、US 実装を開始できる

---

## Phase 3: User Story 1 - 承認した献立が自動でカレンダーに記録される (Priority: P1) 🎯 MVP

**Goal**: チャットで提案された献立をユーザーが承認したとき、エージェントがそれを検知し、承認日を起点とする連続日に各料理を記録する

**Independent Test**: 数日分の献立を提案・承認し、(a) 承認日起点の連続日に、(b) 各料理が名前・材料・手順つきで記録され、(c) 未承認では記録されないことを確認できる

### Tests for User Story 1

- [x] T005 [P] [US1] 日付割当の単体テスト（`assignDates`：day(1..N) を承認日起点の eatenOn に写像、月またぎ・同一 day 複数料理を含む、FR-004/005/SC-008）（src/server/services/meal-log.test.ts）

### Implementation for User Story 1

- [x] T006 [US1] 記録ロジック（`assignDates(meals, approvalDate)` で eatenOn を算出し meal_logs に INSERT 群、Asia/Tokyo 基準、FR-001/003/006）を実装（src/server/services/meal-log.ts）
- [x] T007 [US1] `recordMealPlan` ツール（承認された献立の meals を受け、記録ロジックを呼ぶ。data-model.md のツール契約準拠。副作用は execute 内の決定的コード、FR-001/002）を実装（src/server/agent/tools/record-meal-plan.ts）
- [x] T008 [US1] `runAgent` の tools に `recordMealPlan` を登録し、運用プロンプトに「ユーザーが献立を承認したら recordMealPlan を呼ぶ／未承認では呼ばない」を追記（承認ゲート、FR-002）（src/server/agent/agent.ts）

**Checkpoint**: 承認で連続日に記録でき、未承認では記録されない

---

## Phase 4: User Story 2 - カレンダーで月内に食べた料理を見返す (Priority: P1)

**Goal**: チャットとは別画面の月カレンダーで、その月の料理名を一覧し、選べば材料・手順を確認できる（空状態も破綻しない）

**Independent Test**: 記録が1件以上ある月でカレンダーを開き、日付ごとの料理名表示・材料/手順の閲覧・月切替・0件時の空状態を確認できる

### Tests for User Story 2

- [x] T009 [P] [US2] 当月抽出の境界の単体テスト（`monthRange`：月初/翌月初、月末・年またぎ、FR-007）（src/server/services/meal-log.test.ts）

### Implementation for User Story 2

- [x] T010 [US2] `GET /api/meals?month=YYYY-MM` 一覧エンドポイント（当月 eatenOn 範囲の MealLog を content 付きで返す、FR-007/008）を実装（src/routes/api/meals.ts）
- [x] T011 [P] [US2] `MonthCalendar`（月グリッド・日セルに料理名・前月/翌月切替・0件時の空状態、FR-008/010/011）を実装（src/components/calendar/MonthCalendar.tsx）
- [x] T012 [P] [US2] `DayDishList`（1日分の料理名リスト。詳細ダイアログを開く導線）を実装（src/components/calendar/DayDishList.tsx）
- [x] T013 [P] [US2] `DishDetailDialog`（料理の材料・手順を表示。002/001 の描画を流用、FR-009）を実装（src/components/calendar/DishDetailDialog.tsx）
- [x] T014 [US2] カレンダー画面ルート `/calendar` を追加し、当月データ取得（GET /api/meals）と `MonthCalendar` を結線（FR-007）（src/routes/calendar.tsx）
- [x] T015 [US2] チャット（/）とカレンダー（/calendar）を行き来する導線を追加（src/components/chat/SessionSidebar.tsx、src/routes/index.tsx）

**Checkpoint**: US1＋US2 が動作（MVP：記録＋カレンダー閲覧）

---

## Phase 5: User Story 3 - カレンダーからお気に入り登録する (Priority: P2)

**Goal**: カレンダー上の料理を、その場でお気に入り（002 の保存レシピ）に登録できる。イラストも 002 の既存フローで生成される

**Independent Test**: カレンダー上の料理をお気に入り登録し、(a) お気に入り一覧に現れ、(b) 再読み込み後も保持され、(c) 重複登録で二重に増えないことを確認できる

### Implementation for User Story 3

- [x] T016 [US3] `DishDetailDialog` に「お気に入り登録」アクションを追加し、`meal_logs.content` を 002 の `POST /api/recipes`（`registerRecipe`）へ渡して登録する（新規エンドポイント不要・重複は 002 側で防止、FR-012/014/SC-009）（src/components/calendar/DishDetailDialog.tsx）

**Checkpoint**: US1〜US3 が動作。カレンダーからお気に入り登録でき、イラストは 002 のフローで生成される

---

## Phase 6: User Story 4 - 誤って記録された料理を削除する (Priority: P3)

**Goal**: 誤記録・食べなかった料理をカレンダーから削除し、削除を永続化する

**Independent Test**: 記録済みの料理を削除し、カレンダーから消え、再読み込み後も復活しないことを確認できる

### Implementation for User Story 4

- [x] T017 [US4] `DELETE /api/meals/{id}` エンドポイント（UUID 検証・存在しない ID は no-op・`meal_logs.userId` でログインユーザーに絞り込む、FR-012）を実装（src/routes/api/meals/$id.ts）
- [x] T018 [US4] `DishDetailDialog`／`DayDishList` に削除アクションを追加し、DELETE 成功時のみ UI から除去して結線（SC-007）（src/components/calendar/DishDetailDialog.tsx、src/routes/calendar.tsx）

**Checkpoint**: 全 US が動作

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: 全 US にまたがる仕上げと、実装確定に伴う記録

- [ ] T019 [P] quickstart.md の US1〜US4 検証シナリオを手動実行
- [ ] T020 Cloud Run への反映と `db:migrate` 実適用 → 最終デプロイフェーズに先送り（001 T050・002 T029 と同様、GCP 設定完了後）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし。即開始可
- **Foundational (Phase 2)**: Setup 完了に依存。全 US をブロック（T002 スキーマ → T004 サービス基盤の順）
- **User Stories (Phase 3〜6)**: Foundational 完了に依存。優先度順（US1→US2→US3→US4）
- **Polish (Phase 7)**: 対象 US 完了に依存

### User Story Dependencies

- **US1 (P1)**: Foundational 後に開始可。記録ロジック（T006）→ ツール（T007）→ 結線（T008）の順
- **US2 (P1)**: Foundational 後に開始可。閲覧は US1 の記録があると検証しやすいが、一覧・UI は独立実装・独立テスト可
- **US3 (P2)**: US2（詳細ダイアログ）を前提に、お気に入り登録アクションを足す。002 の登録フローに依存（既存）
- **US4 (P3)**: US2（UI）を前提に削除を足す

### Within Each User Story

- テスト（決定的ロジック）→ サービス → ツール／エンドポイント → UI → 結線 の順
- サービス（meal-log.ts）を先に固め、ツール・エンドポイント・UI から呼ぶ

### Parallel Opportunities

- Setup の T001 は単独
- 各 US のテスト [P]（T005/T009）は並列可
- US2 の UI コンポーネント（T011/T012/T013）は別ファイルで並列可（T014 の結線前に用意）
- `meal-log.ts` を触るタスク（T004/T006）は同一ファイルのため直列

---

## Parallel Example: User Story 2

```bash
# US2 の UI コンポーネントをまとめて起票（別ファイル・依存なし）:
Task: "MonthCalendar を実装 src/components/calendar/MonthCalendar.tsx"
Task: "DayDishList を実装 src/components/calendar/DayDishList.tsx"
Task: "DishDetailDialog を実装 src/components/calendar/DishDetailDialog.tsx"
```

---

## Implementation Strategy

### MVP First（US1＋US2 まで）

1. Phase 1 Setup を完了
2. Phase 2 Foundational を完了（スキーマ＋サービス基盤。全 US をブロック）
3. Phase 3 US1（承認→記録）→ Phase 4 US2（カレンダー閲覧）を完了
4. **STOP & VALIDATE**: 承認→記録→カレンダー表示→材料/手順閲覧を独立検証
5. 問題なければデモ

### Incremental Delivery

1. Setup + Foundational → 土台（スキーマ＋サービス）
2. US1（記録）→ US2（閲覧）→ 独立検証 → デモ（MVP！）
3. US3（カレンダーからお気に入り）→ 独立検証 → デモ
4. US4（削除）→ 独立検証 → デモ

---

## Notes

- [P] は別ファイル・依存なし。[Story] はトレーサビリティ用
- 決定的ロジック（日付割当・当月抽出）を単体テストで担保。承認判断そのもの（LLM）は対象外
- 承認ゲート＝「recordMealPlan が呼ばれたときだけ記録」。未承認の会話は記録しない（FR-002/SC-006）
- meal_logs はスナップショット保持で 002 の saved_recipes を変更しない（ADR-14）。お気に入り登録は 002 の登録フロー再利用
- マイグレーションの実適用（db:migrate）は別ブランチ・最終フェーズ（T003/T020）
- コミットはタスクまたは論理的なまとまりごと（コミット規約に従う）
- 各 Checkpoint で US を独立検証してから次へ

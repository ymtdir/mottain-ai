---
description: "Task list for レシピカード（お気に入り登録・カード表示）"
---

# Tasks: レシピカード（お気に入り登録・カード表示）

**Input**: 設計ドキュメント `specs/002-recipe-card/`（plan.md / spec.md / research.md / data-model.md / quickstart.md）

**前提**: 技術スタックは 001 と共通（ADR-04〜11）。本機能は新技術・新 GCP インフラを増やさない。イラスト生成は既存 `@ai-sdk/google-vertex` の Gemini 画像モデル（`gemini-3.1-flash-image`）＋Vercel AI SDK の `generateText`（画像モダリティ出力）、画像保存は既存 Postgres（bytea）。新規依存の追加は不要。

**テスト方針**: 全面 TDD ではなく、越えてはならない不変条件に絞って Vitest（コロケーション単体）を書く。対象 = INV-1 重複登録が二重に増えない（FR-004）、INV-2 一覧応答に画像バイトを載せない（R2）、INV-3 生成状況の状態遷移（stale 再キック・冪等を含む、FR-012/013/015）。

**構成**: タスクはユーザーストーリー単位。段階順は「Setup → Foundational（スキーマ＋サービス基盤）→ US1 → US2 → US3 → US4」。MVP は US1＋US2（保存＋カード閲覧、ともに P1）。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 並列実行可（別ファイル・依存なし）
- **[Story]**: 対応するユーザーストーリー（US1〜US4）。Setup / Foundational / Polish は付けない
- ファイルパスを明記

---

## Phase 1: Setup（共有基盤）

**Purpose**: 機能実装に必要なディレクトリを用意する（新規依存はなし）

- [x] T001 [P] レシピ UI 用ディレクトリを用意（src/components/recipe/）

---

## Phase 2: Foundational（ブロッキング前提 — スキーマとサービス基盤）

**Purpose**: すべての US の前提。永続化スキーマと保存レシピサービスの土台を通す

**⚠️ CRITICAL**: この Phase 完了まで US の作業は開始できない

- [x] T002 Drizzle スキーマに `saved_recipes` を追加（src/server/db/schema.ts、data-model.md 準拠：content JSONB / illustrationStatus / illustrationData(bytea) / illustrationMime / illustrationError / normalizedTitle・`(userId, normalizedTitle)` 一意 / userId index / timestamps）
- [x] T003 初期マイグレーションを生成・適用（`pnpm db:generate` → `pnpm db:migrate`）※ライブ DB 要・後回し
- [x] T004 SavedRecipe サービスの基盤（型定義・`normalizeTitle`（trim＋空白畳み込み）・一覧/単体取得）を実装（src/server/services/saved-recipe.ts）

**Checkpoint**: スキーマとサービス基盤が用意でき、US 実装を開始できる

---

## Phase 3: User Story 1 - 気に入ったレシピをお気に入り登録する (Priority: P1) 🎯 MVP

**Goal**: 提案レシピをワンアクションで登録し、生成を待たず即時に永続化する（重複は増やさない）

**Independent Test**: レシピを登録し、(a) 即時に「登録済み」になり、(b) 再読み込み後も保持され、(c) 同名の再登録で二重に増えないことを確認できる

### Tests for User Story 1

- [x] T005 [P] [US1] 重複登録が二重に増えない単体テスト（normalizedTitle、INV-1/FR-004）（src/server/services/saved-recipe.test.ts）
- [x] T006 [P] [US1] 空題レシピの登録拒否・空 steps レシピの許容の単体テスト（FR-002／Edge Case）（src/server/services/saved-recipe.test.ts）

### Implementation for User Story 1

- [x] T007 [US1] 登録ロジック（create・`pending` で保存・重複時は既存を返す、FR-001〜004/011）を実装（src/server/services/saved-recipe.ts）
- [x] T008 [US1] `POST /api/recipes` 登録エンドポイント（Zod で `content: Recipe` 検証・生成を待たず即時応答、FR-011）を実装（src/routes/api/recipes.ts）
- [x] T009 [US1] 保存ボタンを実装し `MealPlanCard` の各品に付ける（登録済み状態を反映）（src/components/recipe/SaveRecipeButton.tsx、src/components/meal-plan/MealPlanCard.tsx）
- [x] T010 [US1] `routes/index.tsx` に保存レシピの state・登録ハンドラを結線（src/routes/index.tsx）

**Checkpoint**: レシピを登録でき、即時・永続・重複防止が効く

---

## Phase 4: User Story 2 - 登録レシピをカード形式で一覧・閲覧する (Priority: P1)

**Goal**: 保存レシピをカード一覧で見返し、材料・手順を提案時と同じ形式で確認できる（空状態も破綻しない）

**Independent Test**: 登録済みが1件以上ある状態で一覧を開き、カード表示・材料/手順の閲覧・0件時の空状態を確認できる

### Tests for User Story 2

- [x] T011 [P] [US2] 一覧応答に画像バイトを含めない単体テスト（INV-2/R2）（src/server/services/saved-recipe.test.ts）

### Implementation for User Story 2

- [x] T012 [US2] `GET /api/recipes` 一覧エンドポイント（status・メタのみ返し画像バイトは除外、FR-006）を実装（src/routes/api/recipes.ts）
- [x] T013 [US2] `SavedRecipesView`（カード一覧＋0件時の空状態、FR-006/009）を実装（src/components/recipe/SavedRecipesView.tsx）
- [x] T014 [US2] `SavedRecipeCard`（レシピ名＋画像欄＋材料/手順。`MealPlanCard` の描画を流用、FR-007/008）を実装（src/components/recipe/SavedRecipeCard.tsx）
- [x] T015 [US2] サイドバーに「保存レシピ」導線を追加し `SavedRecipesView` を開く（既存の好み・苦手と同じ流儀）（src/components/chat/SessionSidebar.tsx、src/routes/index.tsx）

**Checkpoint**: US1＋US2 が動作（MVP：保存＋カード閲覧）

---

## Phase 5: User Story 3 - 料理のイラストが非同期で用意される (Priority: P2)

**Goal**: 登録をブロックせず、バックエンドで非同期にイラストを生成。生成中/生成済み/生成失敗を表示し、失敗・中断（stale）から再試行・復旧できる

**Independent Test**: 登録が即時完了し、(a) 開くと「生成中」、(b) 完了でイラスト表示、(c) 失敗で失敗表示＋再試行、(d) 中断（stale）した生成が再キックで復旧、を確認できる

### Tests for User Story 3

- [x] T016 [P] [US3] 状態遷移の単体テスト（pending→generating→ready/failed、failed→generating 再試行、非 stale の generating は再キックしない冪等、stale な generating は再キック、INV-3/FR-012/013/015）（src/server/services/saved-recipe.test.ts）

### Implementation for User Story 3

- [x] T017 [P] [US3] Gemini 画像モデルのプロバイダラッパを実装（遅延生成、gemini.ts に倣う）（src/server/model/image-model.ts）
- [x] T018 [US3] イラスト生成サービス（`generateText` の画像モダリティ出力で生成のみ。画像バイトと MIME を返す）を実装（src/server/services/illustration.ts）
- [x] T019 [US3] 状態遷移・stale 判定（`updatedAt` ベースのリース期限・再キック可否、FR-012/013）を実装（src/server/services/saved-recipe.ts）
- [x] T020 [US3] `POST /api/recipes/{id}/illustration`（生成の発火・再試行。非 stale の generating は no-op、pending/failed/stale generating は開始、FR-012/015）を実装（src/routes/api/recipes/$id.illustration.ts）
- [x] T021 [US3] `GET /api/recipes/{id}/illustration`（`ready` のとき画像バイトを `Content-Type` 付きで配信、未 ready は 404/204）を実装（src/routes/api/recipes/$id.illustration.ts）
- [x] T022 [US3] `SavedRecipeCard` の画像欄に生成状況表示（生成中／イラスト／生成失敗＋再試行、FR-014）を実装（src/components/recipe/SavedRecipeCard.tsx）
- [x] T023 [US3] 登録後の生成発火＋カード開封時の生成保証＋未完了レシピの軽いポーリングを結線（R1/R4、生成の成否は閲覧を妨げない＝FR-016）（src/routes/index.tsx、src/components/recipe/SavedRecipesView.tsx）

**Checkpoint**: US1〜US3 が動作。非同期生成・状態表示・stale 復旧を検証済み

---

## Phase 6: User Story 4 - 登録レシピを削除する (Priority: P3)

**Goal**: 不要なレシピをお気に入りから削除し、削除を永続化する

**Independent Test**: レシピを削除し、一覧から消え、再読み込み後も復活しないことを確認できる

### Implementation for User Story 4

- [x] T024 [US4] 削除ロジック（FR-010）を実装（src/server/services/saved-recipe.ts）
- [x] T025 [US4] `DELETE /api/recipes/{id}` エンドポイントを実装（src/routes/api/recipes/$id.ts）
- [x] T026 [US4] `SavedRecipeCard`／`SavedRecipesView` に削除アクションを追加し結線（src/components/recipe/SavedRecipeCard.tsx、src/routes/index.tsx）

**Checkpoint**: 全 US が動作

---

## Phase 7: Polish & Cross-Cutting

**Purpose**: 全 US にまたがる仕上げと、実装確定に伴う記録

- [x] T027 [P] quickstart.md の US1〜US4 検証シナリオを手動実行
- [x] T028 ADR「レシピイラストの非同期生成と画像保存方式」を作成（`create-adr`。MVP＝クライアント起点発火＋Postgres bytea 配信を Accepted、Cloud Tasks／GCS を upgrade path として記録。plan.md のフォローアップ）
- [ ] T029 Cloud Run への反映と bytea 画像配信の動作確認 → 最終デプロイフェーズに先送り（001 T050 と同様、GCP 設定完了後）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 依存なし。即開始可
- **Foundational (Phase 2)**: Setup 完了に依存。全 US をブロック（T002 スキーマ → T004 サービス基盤の順）
- **User Stories (Phase 3〜6)**: Foundational 完了に依存。優先度順（US1→US2→US3→US4）
- **Polish (Phase 7)**: 対象 US 完了に依存

### User Story Dependencies

- **US1 (P1)**: Foundational 後に開始可。他 US に依存しない
- **US2 (P1)**: Foundational 後に開始可。`recipes.ts` を US1（POST）と共有（GET を追加）するが、一覧ロジックは独立テスト可
- **US3 (P2)**: US1（登録済みレシピ）・US2（カード表示）を前提に非同期生成を積む。生成サービス・状態遷移の単体は独立テスト可
- **US4 (P3)**: US1（対象レシピ）・US2（UI）を前提に削除を足す

### Within Each User Story

- テスト（不変条件）→ サービス（決定的ロジック）→ エンドポイント → UI → 結線 の順
- サービスを先に固め、エンドポイント／UI から呼ぶ

### Parallel Opportunities

- Setup の T001 は単独
- 各 US 内のテスト [P]（T005/T006/T011/T016）は並列可
- US3 の Gemini 画像モデルラッパ（T017[P]）は生成サービスと並行して用意可
- `saved-recipe.ts` を触るタスク（T004/T007/T019/T024）は同一ファイルのため直列

---

## Parallel Example: User Story 1

```bash
# US1 の不変条件テストをまとめて起票:
Task: "重複登録が二重に増えない単体テスト src/server/services/saved-recipe.test.ts"
Task: "空題拒否・空 steps 許容の単体テスト src/server/services/saved-recipe.test.ts"
```

---

## Implementation Strategy

### MVP First（US1＋US2 まで）

1. Phase 1 Setup を完了
2. Phase 2 Foundational を完了（スキーマ＋サービス基盤。全 US をブロック）
3. Phase 3 US1（登録）→ Phase 4 US2（カード閲覧）を完了
4. **STOP & VALIDATE**: 保存 → 一覧 → 材料/手順閲覧を独立検証
5. 問題なければデモ

### Incremental Delivery

1. Setup + Foundational → 土台（スキーマ＋サービス）
2. US1（登録）→ US2（カード閲覧）→ 独立検証 → デモ（MVP！）
3. US3（非同期イラスト・状態表示・stale 復旧）→ 独立検証 → デモ
4. US4（削除）→ 独立検証 → デモ

---

## Notes

- [P] は別ファイル・依存なし。[Story] はトレーサビリティ用
- 不変条件（重複防止／一覧に画像バイト非搭載／状態遷移・stale 再キック）を各 US の単体テストで担保
- イラスト生成の成否は保存・一覧・材料/手順の閲覧を妨げない（FR-016）
- コミットはタスクまたは論理的なまとまりごと（コミット規約に従う）
- 各 Checkpoint で US を独立検証してから次へ
- 実装着手前に T028 の ADR を確定するのが望ましい（憲章 III）

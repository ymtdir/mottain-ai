# Data Model: 食事カレンダー（食べた料理の記録・カレンダー閲覧）

Phase 1。エンティティ・保存マッピング・日付割当・ツール契約/エンドポイントを定義する。実装コードは tasks/implement で作る。

## エンティティ

### MealLog（食事記録）

「その日に食べた（作る）1 つの料理」。料理内容は 001 の `Recipe` と同形（`day` は保持しない）を JSONB でスナップショット保持する。

| フィールド | 型 | 説明 |
|-----------|----|------|
| `id` | uuid (PK) | 生成 ID |
| `userId` | uuid (FK→users) | 固定ユーザー（MVP、`FIXED_USER_ID`） |
| `eatenOn` | date | 食べた（作る）日。時刻は持たない（日単位） |
| `content` | jsonb | 料理内容 `{ title, ingredients: {name, amount \| null}[], steps: string[], notes: string \| null }` |
| `createdAt` | timestamptz | 記録時刻 |

**バリデーション**:
- `content.title` は必須・非空。
- `ingredients` / `steps` は空配列可（001 の「残り」レシピ等を許容）。
- 重複排除はしない。同一 `eatenOn`・同一 `content.title` でも別レコードとして残す（仕様: 細かな違いは別記録）。

**関係**: `users` 1 —— * `MealLog`。002 の `saved_recipes` とは関係を持たない（独立）。将来お気に入りへ紐付ける場合は nullable な `sourceRecipeId`（FK→saved_recipes）を後から追加する余地を残す（本 spec では持たない）。

**インデックス**: 当月抽出のため `(userId, eatenOn)` にインデックスを付与する。

## 日付割当（承認日起点）

献立の各 `Recipe` は `day: number`（1..N）を持つ。記録日は決定論的に算出する。

```
eatenOn(recipe) = 承認日(Asia/Tokyo の当日) + (recipe.day - 1) 日
```

- N 日分の献立を承認 → 承認日から連続 N 日に各日の料理を記録（月をまたいでよい＝Edge Case）。
- 同じ day に複数の料理があれば、その同一 `eatenOn` に複数 `MealLog` を作る（区分なし複数＝FR-005）。
- 基準日「今日」は Asia/Tokyo で一貫して扱う（ずれ防止）。

## 記録の契機（承認ツール）

承認検知はエージェントのツール呼び出しをゲートにする（research R1）。`runAgent` の tools に追加する。

### `recordMealPlan` ツール契約

| 項目 | 内容 |
|------|------|
| 目的 | ユーザーが承認した献立を `meal_logs` に記録する（FR-001/002） |
| 呼ぶ条件 | ユーザーが提案された献立を承認したとモデルが判断したときのみ（提案・修正の途中では呼ばない） |
| 入力 (Zod) | `{ meals: { day: number; title: string; ingredients: {name, amount\|null}[]; steps: string[]; notes: string\|null }[] }`（承認された献立の各料理。会話中の最新の献立から埋める） |
| 副作用 | `execute` 内で承認日を基準に `eatenOn` を算出し、各 meal を `meal_logs` に INSERT（決定的コード。`meal-log.ts` の記録関数に委譲） |
| 出力 | `{ success: true, recordedCount: number, range: { from: date, to: date } }`（画面表示はカレンダー側。会話では簡潔に「記録しました」） |

- 承認ゲート = 「このツールが呼ばれたときだけ記録」。運用プロンプト（`OPERATION_INSTRUCTIONS`）に「ユーザーが献立を承認したら recordMealPlan を呼ぶ。未承認では呼ばない」を追記する。
- `meals` はモデルが会話中の最新献立から埋める（サーバー側に直近献立の永続ストアは持たないため、ツール引数で受ける）。

## エンドポイント（contracts はスキップ・ここに列挙）

内部向けの薄い REST。既存の `createFileRoute(...).server.handlers` パターンに従い、Zod で入力検証する。

| メソッド・パス | 用途 | 主な入出力 |
|----------------|------|-----------|
| `GET /api/meals?month=YYYY-MM` | 当月の食事記録一覧（カレンダー表示元・FR-007/008） | → `MealLog[]`（当月 `eatenOn` 範囲。`content` を含む） |
| `DELETE /api/meals/{id}` | 誤記録の削除（FR-012） | UUID 検証 → 204（存在しなければ no-op） |
| （再利用）`POST /api/recipes` | カレンダーからのお気に入り登録（FR-012 お気に入り・FR-014） | ← `{ content }`（`meal_logs.content` をそのまま渡す）→ 002 の `SavedRecipe`（重複は増やさない・イラストは既存フローで生成） |

- 記録の作成は上表に持たない。作成は `recordMealPlan` ツール経由のみ（承認ゲート）。手動追加エンドポイントは MVP では設けない。
- 月クエリは `eatenOn` の `[月初, 翌月初)` 範囲で抽出する（`meal-log.ts` の決定的関数）。

## カレンダー表示マッピング

| 対象 | 表示 |
|------|------|
| 日セル | その日の `MealLog[]` の `content.title` を並べる（料理名のみ・イラストなし＝FR-008） |
| 料理名を選択 | `content` の材料・手順をダイアログ表示（002/001 の描画流用＝FR-009）。ダイアログから「お気に入り登録」「削除」 |
| 0 件の日／月 | 空状態を破綻なく表示（FR-011） |
| 月切替 | 前月・翌月（FR-010）。当月データを `GET /api/meals?month=` で取得 |

## サービス関数（決定的ロジック・`meal-log.ts`）

単体テスト（Vitest コロケーション）で担保する対象:
- `assignDates(meals, approvalDate)`: `day` を承認日起点の `eatenOn` に写像（月またぎ含む）。
- `monthRange(month: "YYYY-MM")`: `[月初, 翌月初)` を返す（当月抽出の境界）。
- 記録（INSERT 群）・当月一覧・削除は DB 操作としてサービスに置く（LLM 非依存）。

## 保存マッピング（Drizzle）

- 新テーブル `meal_logs` を `src/server/db/schema.ts` に追加（既存の `pgTable` 流儀＝uuid PK・`userId` FK・timestamptz・JSONB。日付は `date` 型）。
- `(userId, eatenOn)` にインデックスを付与（当月抽出）。
- マイグレーションはライブ DB 適用が要るため、生成物（schema 定義＋migration ファイル）のみ用意し、`db:migrate` の実適用は別ブランチ・最終フェーズに委ねる（002 の T003 と同じ扱い。tasks で明示）。

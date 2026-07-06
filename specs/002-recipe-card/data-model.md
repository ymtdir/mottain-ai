# Data Model: レシピカード（お気に入り登録・カード表示）

Phase 1。エンティティ・保存マッピング・状態遷移・エンドポイントを定義する。実装コードは tasks/implement で作る。

## エンティティ

### SavedRecipe（保存レシピ）

お気に入り登録された1つのレシピ。レシピ内容は 001 の `Recipe` を JSONB で保持する。

| フィールド | 型 | 説明 |
|-----------|----|------|
| `id` | uuid (PK) | 生成 ID |
| `userId` | uuid (FK→users) | 固定ユーザー（MVP、`FIXED_USER_ID`） |
| `normalizedTitle` | text | 重複判定キー（title を trim＋空白畳み込みで正規化）。`(userId, normalizedTitle)` に一意制約 |
| `content` | jsonb | レシピ内容 `{ title, ingredients: {name, amount \| null}[], steps: string[], notes: string \| null }`（`day` は保持しない） |
| `illustrationStatus` | text | 生成状況。`pending` / `generating` / `ready` / `failed`（既定 `pending`） |
| `illustrationData` | bytea (nullable) | 生成画像のバイト列。`ready` のときのみ非 null |
| `illustrationMime` | text (nullable) | 画像の MIME（例 `image/png`） |
| `illustrationError` | text (nullable) | 直近の生成失敗の要点（任意、デバッグ/表示用） |
| `createdAt` | timestamptz | 登録時刻 |
| `updatedAt` | timestamptz | 更新時刻（状態遷移で更新） |

**バリデーション**:
- `content.title` は必須・非空（FR-002）。空題のレシピは登録不可。
- `ingredients` / `steps` は空配列可（001 の「残り」レシピ等、手順が空のケースを許容＝Edge Case）。
- `illustrationData` は `illustrationStatus === "ready"` のときのみ存在する。

**関係**: `users` 1 —— * `SavedRecipe`。`FavoriteCollection` は概念上の集合で、実体は `saved_recipes` の当該ユーザー行の集合。

### FavoriteCollection（お気に入りコレクション）

ユーザーに紐づく `SavedRecipe` の集合（カード一覧の表示元）。専用テーブルは持たず、`saved_recipes` を `userId` で絞った集合として扱う。重複を持たない（R5 の一意制約で担保）。

## イラスト生成の状態遷移（IllustrationJob の概念）

`illustrationStatus` の遷移。専用テーブルは作らず `saved_recipes` の列で表現する。

```
[登録] → pending
pending → generating         （生成エンドポイントが処理開始）
generating → ready           （生成成功・画像を保存）
generating → failed          （生成失敗・error 記録）
failed → generating          （再試行 FR-015）
pending → generating         （カード開封時の生成保証で発火）
generating(stale) → generating（期限切れの生成中を再キック＝クラッシュ/再起動からの復旧）
```

- 登録レスポンスは `pending` を返した時点で完了する（生成完了を待たない＝FR-011 / SC-007）。
- 生成の成否は保存・一覧・閲覧を妨げない（FR-016）。`failed`/`pending` でも `content` は常に閲覧可能。
- **`generating` の stale（リース期限切れ）判定**: `generating` は「処理中を主張するリース」とみなし、`updatedAt` から一定時間（例: 数分）を超えた `generating` は **stale = 中断された** と判定する。プロセスがクラッシュ・再起動して `generating` のまま固定されても、stale なら復旧のため再キックできる（永久固定を防ぐ）。閾値は実装時に確定。
- 冪等性と再キックの両立: `POST /api/recipes/{id}/illustration` は、**非 stale の `generating`** に対しては何もしない（二重生成を防ぐ）。**`pending` / `failed` / stale な `generating`** に対しては（再）生成を開始し、開始時に `updatedAt` を更新してリースを取り直す。
- カード開封時の生成保証（R1）は、`pending` / `failed` に加えて **stale な `generating`** も対象に含める。

## カード画像欄の表示マッピング（FR-014）

| illustrationStatus | 画像欄の表示 |
|--------------------|-------------|
| `pending` / `generating` | 「生成中」を示すプレースホルダ（スピナー等） |
| `ready` | 生成イラスト（`GET /api/recipes/{id}/illustration`） |
| `failed` | 「生成失敗」表示＋再試行アクション |

## エンドポイント（contracts はスキップ・ここに列挙）

内部向けの薄い REST。既存の `createFileRoute(...).server.handlers` パターンに従い、Zod で入力検証する。

| メソッド・パス | 用途 | 主な入出力 |
|----------------|------|-----------|
| `GET /api/recipes` | 保存レシピ一覧（カード表示元） | → `SavedRecipe[]`（`illustrationData` は含めず status とメタのみ） |
| `POST /api/recipes` | お気に入り登録（FR-001〜004） | ← `{ content: Recipe }` → 作成/既存の `SavedRecipe`（重複時は既存を返す・二重に増やさない） |
| `DELETE /api/recipes/{id}` | 削除（FR-010） | → `{ ok: true }` |
| `POST /api/recipes/{id}/illustration` | 生成の発火・再試行（FR-012 / FR-015） | 冪等。**非 stale の `generating` 中は何もしない**が、`pending`/`failed`/stale な `generating` は（再）開始する。完了時 `ready`/`failed` |
| `GET /api/recipes/{id}/illustration` | 画像バイト配信（`ready` のみ） | → 画像バイト（`Content-Type`＝保存 MIME）。未 ready は 404/204 |

**注**: 一覧応答に画像バイトは載せない（R2、行肥大回避）。カードは status を見て、`ready` のときだけ画像エンドポイントを参照する。

## 保存マッピング（Drizzle）

- 新テーブル `saved_recipes` を `src/server/db/schema.ts` に追加（既存の `pgTable` 流儀＝uuid PK・`userId` FK・timestamptz・JSONB）。
- `normalizedTitle` に `(userId, normalizedTitle)` の一意インデックス、一覧取得のため `userId` インデックスを付与。
- マイグレーションはライブ DB 適用が要るため、001 の T008 同様に生成物のみ用意し適用は最終フェーズに委ねてよい（tasks で明示）。

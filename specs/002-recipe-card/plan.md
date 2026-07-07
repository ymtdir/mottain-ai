# 実装計画: レシピカード（お気に入り登録・カード表示）

**Branch**: `002-recipe-card` | **Date**: 2026-07-06 | **Spec**: [spec.md](./spec.md)

**Input**: 機能仕様 `specs/002-recipe-card/spec.md`

> 注記: 技術前提は 001 と共通（[ADR-04](../../docs/adr/04-infra-cloud-run.md) Cloud Run / Cloud SQL、[ADR-05](../../docs/adr/05-web-framework-tanstack-start.md) TanStack Start、[ADR-06](../../docs/adr/06-ai-core-gemini-enterprise-agent-platform.md) Gemini Enterprise Agent Platform、[ADR-07](../../docs/adr/07-agent-framework-vercel-ai-sdk.md) Vercel AI SDK、[ADR-08](../../docs/adr/08-orm-drizzle.md) Drizzle、[ADR-10](../../docs/adr/10-frontend-ui-shadcn-tailwind.md) shadcn/ui＋Tailwind、[ADR-11](../../docs/adr/11-lint-format-eslint-prettier.md) ESLint/Prettier/Vitest）。本機能は新技術を増やさず、既存スタックの範囲で実装する。イラスト生成は既存の Gemini Enterprise Agent Platform の **Gemini 画像モデル（`gemini-3.1-flash-image`）** を使う（Imagen 4 系 API は 2026-06-24 に終了し画像生成が Gemini API へ統合された）。ただし「非同期生成の実行方式」と「生成画像の保存先」は新たな設計判断のため ADR に残す（下記フォローアップ）。

## Summary

チャットで提案された献立の一品を、ワンアクションでお気に入り登録し（永続化・重複防止）、カード形式の一覧で材料・手順まで見返せるようにする。料理のイラストは登録処理から切り離し、バックエンドで **非同期に生成**してレシピへ紐付ける。生成が済むまでにカードを開いても、画像欄に生成中／生成失敗の状態を表示し、失敗時は再試行できる。

技術的アプローチ: 既存の単一 TanStack Start アプリ内で完結させる。永続化は Cloud SQL に新テーブル `saved_recipes` を追加（レシピ内容は 001 の `Recipe` 構造をそのまま JSONB で保持）。お気に入りの CRUD・重複判定・状態遷移はサーバーサービス（決定的コード）に置く。イラスト生成は Vercel AI SDK の `generateText`（画像モダリティ出力）＋ Gemini Enterprise Agent Platform の Gemini 画像モデル（`gemini-3.1-flash-image`）で行い、**登録レスポンスをブロックしない**。UI は既存のサイドバー導線（食の好み・苦手なものと同じ流儀）に「保存レシピ」を追加し、`MealPlanCard` に保存ボタンを足す。過剰な非同期基盤（キュー・ワーカー常駐）は持ち込まず（YAGNI）、MVP は「登録＝即時保存 → クライアント起点で生成エンドポイントを発火 → カードを開いた際に未完了なら生成を保証」する軽量な方式を採る。

## Technical Context

**Language/Version**: TypeScript（TanStack Start アプリ＝UI ＋サーバー関数。単一言語・単一サービス。001 と共通）

**Primary Dependencies**: TanStack Start（Router・Vite）／ Vercel AI SDK（`generateText` の画像モダリティ出力）＋ Gemini 画像モデル `gemini-3.1-flash-image`（Gemini Enterprise Agent Platform。プロバイダは既存の `@ai-sdk/google-vertex`）／ Drizzle ORM＋postgres.js ／ shadcn/ui＋Tailwind ／ Zod

**Storage**: Cloud SQL for PostgreSQL。新テーブル `saved_recipes`（レシピ内容は JSONB、イラスト生成状況は列で保持）。生成画像は MVP では DB（bytea）に保持し、専用エンドポイントで配信する（GCS への移行は upgrade path。research 参照）

**Testing**: Vitest（サービスの単体テスト＝重複判定・状態遷移・入力検証をコロケーション。画像生成の実呼び出し・E2E は対象外）

**Target Platform**: Cloud Run（コンテナ、ゼロスケール、リクエスト単位で CPU 割当）

**Project Type**: Web application（TanStack Start フルスタック単一アプリ）

**Performance Goals**: お気に入り登録操作はイラスト生成を待たず即時完了（SC-007）。カードの生成状況表示は開いた時点の状態を確実に反映（SC-008）

**Constraints**: Cloud Run はレスポンス後に CPU がスロットルされうるため、「レスポンス後にプロセス内で走らせ続けるバックグラウンド処理」に依存しない設計にする。イラスト生成の成否はレシピの保存・閲覧を妨げない（FR-016）。登録は画像処理でブロックしない（FR-011）

**Scale/Scope**: 個人〜小規模。単一ユーザー／単一世帯（MVP、001 を踏襲）。保存件数は数十〜数百程度を想定

**UI/Design**: [`DESIGN.md`](../../DESIGN.md) の配色・タイポグラフィ・コンポーネントトークンに従う。生の色を直書きせずセマンティックトークンを使う。カードは `card`（クリーム面・lg 角丸）、生成失敗は `destructive` 系で控えめに示す

## Constitution Check

_GATE: Phase 0 前に通過必須。Phase 1 設計後に再確認する。_

| 原則 | 判定 | 根拠 |
|------|------|------|
| I. 軽量さ優先（YAGNI） | PASS | 新技術・新 GCP インフラを増やさない。生成は既存の Gemini Enterprise Agent Platform（Gemini 画像モデル）、保存は既存 Postgres。非同期は「クライアント起点発火＋カード開封時の生成保証＋手動再試行」で実現し、キュー/ワーカー常駐（Cloud Tasks 等）は upgrade path として先送り。レシピ内容は 001 の `Recipe` 型を再利用 |
| II. 仕様駆動開発 | PASS | spec → plan の流れ。tasks/implement へ継続 |
| III. 意思決定は ADR に残す | ⚠ 要フォロー | 「イラストの非同期生成方式」と「生成画像の保存先」は代替案のある新規アーキテクチャ判断。実装前に ADR を1件起こす（下記フォローアップ） |
| IV. AI が追従できるコンテキスト | PASS | 設計を specs/ に残す。規約は AGENTS.md 起点で不変 |
| V. AIエージェントが価値の中心 | PASS | 献立提案（エージェント）の価値を保存・再利用で伸ばす付加機能。エージェント中心を損なわない。イラスト生成も AI（Gemini 画像モデル）能力の活用 |

**フォローアップ（実装前に対応）**:
- `create-adr` で「レシピイラストの非同期生成と画像保存方式」の ADR を作成する。MVP 方式（クライアント起点発火＋DB bytea 配信）を Accepted とし、代替（Cloud Tasks 起点、GCS 保存）を不採用理由つきで残す。

## Project Structure

### Documentation (this feature)

```text
specs/002-recipe-card/
├── plan.md              # 本ファイル（/speckit-plan 出力）
├── research.md          # Phase 0 出力（設計判断）
├── data-model.md        # Phase 1 出力（ドメインモデル＋保存マッピング＋エンドポイント）
├── quickstart.md        # Phase 1 出力（検証手順）
└── tasks.md             # Phase 2 出力（/speckit-tasks で作成）
# contracts/ は 001 同様スキップ（YAGNI）。エンドポイントは data-model.md に列挙する。
```

### Source Code (repository root)

ディレクトリ構成・コロケーション方針は [docs/project-structure.md](../../docs/project-structure.md) を正とする。本機能で追加・変更する主なファイル:

```text
src/
├── routes/
│   ├── index.tsx                         # 変更: 保存レシピの state 配線・保存ハンドラ
│   └── api/
│       ├── recipes.ts                    # 追加: GET 一覧 / POST 登録
│       └── recipes/
│           ├── $id.ts                    # 追加: DELETE 削除
│           └── $id.illustration.ts       # 追加: POST 生成/再試行, GET 画像バイト配信
│
├── server/
│   ├── services/
│   │   ├── saved-recipe.ts               # 追加: 登録・一覧・削除・重複判定・状態遷移（決定的）
│   │   ├── saved-recipe.test.ts          # 追加: コロケーション単体テスト
│   │   └── illustration.ts               # 追加: Gemini 画像モデル呼び出し（生成のみ。副作用は薄く）
│   ├── model/
│   │   └── image-model.ts                 # 追加: Gemini 画像モデルのプロバイダラッパ（Gemini Enterprise Agent Platform。gemini.ts に倣う）
│   └── db/
│       └── schema.ts                     # 変更: saved_recipes テーブル追加
│
└── components/
    └── recipe/
        ├── SavedRecipesView.tsx          # 追加: カード一覧＋空状態（サイドバーから開く）
        ├── SavedRecipeCard.tsx           # 追加: 画像欄の状態表示（生成中/画像/失敗+再試行）
        └── SaveRecipeButton.tsx          # 追加: MealPlanCard の各品に付ける保存ボタン
# components/meal-plan/MealPlanCard.tsx と components/chat/SessionSidebar.tsx を変更（保存導線の追加）
```

**Structure Decision**: 001 と同じ TanStack Start フルスタック単一アプリ（単一 Cloud Run サービス）。お気に入りの永続化・重複判定・状態遷移は `src/server/services/saved-recipe.ts` に集約し、イラスト生成は `src/server/services/illustration.ts`＋`src/server/model/image-model.ts` に分離する。UI は `src/components/recipe/` に新設し、既存のサイドバー設定導線（好み・苦手）と同じ流儀で「保存レシピ」を開く。

## Complexity Tracking

> Constitution Check に I/II/IV/V は違反なし。III は「新規アーキテクチャ判断を ADR に残す」フォローアップで解消する（実装前）。追加インフラ（Cloud Tasks・GCS）は MVP では採用せず先送りするため、複雑性の新規持ち込みはない。

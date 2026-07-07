# 実装計画: 食事カレンダー（食べた料理の記録・カレンダー閲覧）

**Branch**: `003-meal-calendar` | **Date**: 2026-07-07 | **Spec**: [spec.md](./spec.md)

**Input**: 機能仕様 `specs/003-meal-calendar/spec.md`

> 注記: 技術前提は 001・002 と共通（[ADR-04](../../docs/adr/04-infra-cloud-run.md) Cloud Run / Cloud SQL、[ADR-05](../../docs/adr/05-web-framework-tanstack-start.md) TanStack Start、[ADR-06](../../docs/adr/06-ai-core-gemini-enterprise-agent-platform.md) Gemini Enterprise Agent Platform、[ADR-07](../../docs/adr/07-agent-framework-vercel-ai-sdk.md) Vercel AI SDK、[ADR-08](../../docs/adr/08-orm-drizzle.md) Drizzle、[ADR-10](../../docs/adr/10-frontend-ui-shadcn-tailwind.md) shadcn/ui＋Tailwind、[ADR-11](../../docs/adr/11-lint-format-eslint-prettier.md) ESLint/Prettier/Vitest）。本機能は新技術・新 GCP インフラを増やさない。承認検知は既存のエージェント・ツール基盤（ADR-07）にツールを1つ足すだけで実現する。ただし「食事記録のデータモデル（スナップショット保持・お気に入りと分離）」は代替案（正準レシピ＋お気に入りフラグ）を退けた新規の設計判断のため ADR に残す（下記フォローアップ）。

## Summary

チャットで提案された献立をユーザーが承認したとき、エージェントがそれを検知して各料理を「その日に食べた（作る）料理」としてカレンダーに記録する。日付は承認日を起点に連続で自動割当（`Recipe.day` の 1..N をオフセットに使う）。記録は料理内容（名前・材料・手順）を自己完結でスナップショット保持し、重複排除しない。チャットとは別のカレンダー画面（`/calendar`）で、月単位に料理名を一覧し、選べば材料・手順を確認できる。カレンダー上から良かった料理をお気に入り登録でき（002 の登録フロー再利用・イラストも既存フローで生成）、誤記録は削除できる。

技術的アプローチ: 既存の単一 TanStack Start アプリ内で完結。永続化は Cloud SQL に新テーブル `meal_logs` を追加（料理内容は 001 の `Recipe` 構造を JSONB でスナップショット）。承認検知は `runAgent` の tools に `recordMealPlan` ツールを追加して実現する（`learnPreference` 等と同じ pattern、DB 副作用は execute 内の決定的コード）。承認ゲート＝「ツールが呼ばれたときだけ記録」で、曖昧な自由会話からの自動記録はしない。日付割当・当月抽出・削除はサーバーサービス（決定的コード）に置く。カレンダー UI は新ルート `/calendar` に月グリッドを自前実装（shadcn の Calendar は日付ピッカー用途で内容セル表示に合わないため新規依存は足さない）。お気に入り登録は 002 の `registerRecipe` をそのまま呼ぶ。過剰な基盤（キュー・埋め込み検索）は持ち込まない（YAGNI）。

## Technical Context

**Language/Version**: TypeScript（TanStack Start アプリ＝UI ＋サーバー関数。単一言語・単一サービス。001/002 と共通）

**Primary Dependencies**: TanStack Start（Router・Vite）／ Vercel AI SDK（`streamText` の tools・`generateObject`）＋ Gemini（既存 `@ai-sdk/google-vertex`）／ Drizzle ORM＋postgres.js ／ shadcn/ui＋Tailwind ／ Zod。新規依存なし

**Storage**: Cloud SQL for PostgreSQL。新テーブル `meal_logs`（日付＋料理内容 JSONB）。002 の `saved_recipes` は変更しない

**Testing**: Vitest（サービスの単体テスト＝日付割当・当月抽出をコロケーション。LLM 実呼び出し・E2E は対象外）

**Target Platform**: Cloud Run（コンテナ、ゼロスケール、リクエスト単位で CPU 割当）

**Project Type**: Web application（TanStack Start フルスタック単一アプリ）

**Performance Goals**: 承認だけでカレンダーに反映（追加手操作なし＝SC-002）。任意の月の料理を1画面で見返せる（SC-001）

**Constraints**: 承認をはっきり検知したときだけ記録し、未承認の会話を記録しない（FR-002 / SC-006）。イラスト生成はカレンダー記録では行わない（FR-014）。「今日」は一貫した基準日（Asia/Tokyo）で扱いずれさせない

**Scale/Scope**: 個人〜小規模。単一ユーザー／単一世帯（MVP、001/002 を踏襲）。記録件数は月数十〜年数百程度を想定

**UI/Design**: [`DESIGN.md`](../../DESIGN.md) の配色・タイポグラフィ・コンポーネントトークンに従う。生の色を直書きせずセマンティックトークンを使う。カレンダーのマスは `card` 系、当日は控えめに強調、料理名はチップ/リスト表示

## Constitution Check

_GATE: Phase 0 前に通過必須。Phase 1 設計後に再確認する。_

| 原則 | 判定 | 根拠 |
|------|------|------|
| I. 軽量さ優先（YAGNI） | PASS | 新技術・新 GCP インフラなし。承認検知は既存ツール基盤にツール1個追加のみ。カレンダーは自前の月グリッドで新規依存なし。dedup・埋め込み検索・正準レシピ化は持ち込まない（スナップショット保持で単純化） |
| II. 仕様駆動開発 | PASS | spec → plan の流れ。tasks/implement へ継続 |
| III. 意思決定は ADR に残す | ⚠ 要フォロー | 「食事記録のデータモデル（スナップショット保持・お気に入りと分離・dedup しない）」は代替案（正準レシピ＋isFavorite フラグへの刷新）を検討し退けた新規判断。実装前に ADR を1件起こす（下記フォローアップ） |
| IV. AI が追従できるコンテキスト | PASS | 設計を specs/ に残す。規約は AGENTS.md 起点で不変 |
| V. AIエージェントが価値の中心 | PASS | 「承認の検知」自体をエージェントのツール判断に委ねる（単なる保存ボタンに退行させない）。献立提案の価値を「食べた記録の可視化」で伸ばす。将来の好み学習（004）への土台にもなる |

**フォローアップ（実装前に対応）**:
- `create-adr` で「食事記録のデータモデルと記録契機」の ADR を作成する。採用（`meal_logs` スナップショット保持・`saved_recipes` と分離・重複排除なし・承認はエージェントのツール呼び出しをゲートに記録）を Accepted とし、代替（正準レシピ＋isFavorite フラグへの 002 スキーマ刷新、埋め込み検索による類似判定）を不採用理由つきで残す。将来お気に入りへの `sourceRecipeId` 紐付け・好み学習（004）は upgrade path として記録。

## Project Structure

### Documentation (this feature)

```text
specs/003-meal-calendar/
├── plan.md              # 本ファイル（/speckit-plan 出力）
├── research.md          # Phase 0 出力（設計判断）
├── data-model.md        # Phase 1 出力（ドメインモデル＋保存マッピング＋ツール/エンドポイント）
├── quickstart.md        # Phase 1 出力（検証手順）
└── tasks.md             # Phase 2 出力（/speckit-tasks で作成）
# contracts/ は 001/002 同様スキップ（YAGNI）。ツール契約・エンドポイントは data-model.md に列挙する。
```

### Source Code (repository root)

ディレクトリ構成・コロケーション方針は [docs/project-structure.md](../../docs/project-structure.md) を正とする。本機能で追加・変更する主なファイル:

```text
src/
├── routes/
│   ├── calendar.tsx                      # 追加: カレンダー画面（/calendar）
│   ├── index.tsx                         # 変更: チャット↔カレンダーの導線（ナビ）
│   └── api/
│       └── meals.ts                      # 追加: GET 当月一覧
│       └── meals/
│           └── $id.ts                    # 追加: DELETE 削除
│
├── server/
│   ├── agent/
│   │   ├── agent.ts                      # 変更: tools に recordMealPlan を追加
│   │   └── tools/
│   │       └── record-meal-plan.ts       # 追加: 承認された献立を meal_logs に記録するツール
│   ├── services/
│   │   ├── meal-log.ts                   # 追加: 記録・当月一覧・削除・日付割当（決定的）
│   │   └── meal-log.test.ts              # 追加: コロケーション単体テスト（日付割当・当月抽出）
│   └── db/
│       └── schema.ts                     # 変更: meal_logs テーブル追加
│
└── components/
    └── calendar/
        ├── MonthCalendar.tsx             # 追加: 月グリッド（日付マスに料理名）
        ├── DayDishList.tsx               # 追加: 1日分の料理名リスト（削除・お気に入り導線）
        └── DishDetailDialog.tsx          # 追加: 料理の材料・手順を表示（002 の描画流用）
# components/chat/SessionSidebar.tsx もしくは共通ナビにカレンダーへの導線を追加。
# お気に入り登録は 002 の registerRecipe / POST /api/recipes を再利用（新規エンドポイント不要）。
```

**Structure Decision**: 001/002 と同じ TanStack Start フルスタック単一アプリ（単一 Cloud Run サービス）。記録・当月抽出・日付割当・削除は `src/server/services/meal-log.ts` に集約。承認検知は `src/server/agent/tools/record-meal-plan.ts` を `runAgent` の tools に追加して実現（既存ツールと同じ pattern）。カレンダー UI は `src/components/calendar/` に新設し、チャット（`/`）とは別ルート `/calendar` で開く。料理詳細（材料・手順）の描画は 002/001 の表示を流用する。

## Complexity Tracking

> Constitution Check に I/II/IV/V は違反なし。III は「食事記録のデータモデルと記録契機を ADR に残す」フォローアップで解消する（実装前）。正準レシピ化・dedup・埋め込み検索といった複雑性は採用せず、スナップショット保持で単純化しているため新規の複雑性持ち込みはない。

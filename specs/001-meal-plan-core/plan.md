# 実装計画: 献立コア（在庫→献立・買い物リスト＋回避＋対話変更＋好み学習）

**Branch**: `001-meal-plan-core` | **Date**: 2026-07-03 | **Spec**: [spec.md](./spec.md)

**Input**: 機能仕様 `specs/001-meal-plan-core/spec.md`

> 注記: 確定済みの技術前提 — 実行基盤 Cloud Run / Cloud SQL for PostgreSQL / Terraform / GitHub Actions CD（[ADR-04](../../docs/adr/04-infra-cloud-run.md)）、Web フレームワークに TanStack Start（TypeScript・React・Vite）（[ADR-05](../../docs/adr/05-web-framework-tanstack-start.md)）、AI コアに Gemini Enterprise Agent Platform（Gemini）（[ADR-06](../../docs/adr/06-ai-core-gemini-enterprise-agent-platform.md)）、エージェント/オーケストレーション層に Vercel AI SDK（[ADR-07](../../docs/adr/07-agent-framework-vercel-ai-sdk.md)）、ORM に Drizzle＋postgres.js（[ADR-08](../../docs/adr/08-orm-drizzle.md)）、PM/ランタイムに pnpm＋Node（[ADR-09](../../docs/adr/09-package-manager-pnpm-node.md)）、UI に shadcn/ui＋Tailwind（[ADR-10](../../docs/adr/10-frontend-ui-shadcn-tailwind.md)）、リント/整形/テストに ESLint＋Prettier＋Vitest（[ADR-11](../../docs/adr/11-lint-format-eslint-prettier.md)）。

## Summary

チャットで在庫を伝えると、手持ちを使い切る N 日分（1〜7日）の夕食献立と、不足分だけの買い物リストを提案する。アレルギー・苦手食材は絶対に混入させず、対話で献立を変更でき、その中で述べられた好み（味の属性を含む）を学習して以降の提案へ反映する。

技術的アプローチ: エージェントを中心に据え、**Vercel AI SDK（TypeScript）**で単一エージェント＋ツールのループとストリーミングチャットを実装し、**TanStack Start のサーバー関数**に置く（単一言語・単一サービス）。モデルは Gemini Enterprise Agent Platform 経由の Gemini。**回避制約（ハード）と好み（ソフト）を単一の「ユーザー文脈ストア」に永続化し、提案時にエージェントのコンテキストへ注入する**（機械学習は用いない＝YAGNI）。在庫はセッション内のみで永続化しない。永続化は Cloud SQL for PostgreSQL、ビルドした Node サーバを Docker 化して Cloud Run で動かす。

## Technical Context

**Language/Version**: TypeScript（TanStack Start アプリ＝UI ＋サーバー関数＋Vercel AI SDK エージェント。単一言語・単一サービス）

**Primary Dependencies**: TanStack Start（Router・Vite）／ Vercel AI SDK（エージェント＋ストリーミング、Gemini は Gemini Enterprise Agent Platform 経由）／ Drizzle ORM＋postgres.js ／ shadcn/ui＋Tailwind ／ Zod（構造化出力・入力検証）

**Storage**: Cloud SQL for PostgreSQL（ADR-04）。可変構造（回避制約・好みプロファイル・味の感想・会話）は JSONB で保持

**Testing**: Vitest（サーバー関数・エージェントのツール/ドメインロジックの単体・統合テスト。コンポーネント/E2E は対象外）

**Target Platform**: Cloud Run（コンテナ、ゼロスケール）

**Project Type**: Web application（TanStack Start によるフルスタック単一アプリ）

**Performance Goals**: 在庫入力開始から初回献立提案まで通常在庫で3分以内（SC-003）。チャット応答はストリーミングで体感的に即時

**Constraints**: Cloud Run の制約（実行時間上限・常駐不可）に収まる設計。LLM 呼び出しの発火を制御（日数は1〜7日に制限＝FR-006）。アレルギー・苦手の混入は0%（SC-001、越えてはならない制約）。回避（ハード）は好み（ソフト）に常に優先（FR-023）

**Scale/Scope**: 個人〜小規模。単一ユーザー／単一世帯（MVP）。献立は夕食1食のみ

## Constitution Check

*GATE: Phase 0 前に通過必須。Phase 1 設計後に再確認する。*

| 原則 | 判定 | 根拠 |
|------|------|------|
| I. 軽量さ優先（YAGNI） | PASS | Cloud Run に載る単一アプリ。回避・好みを1つのユーザー文脈ストアに集約し、コンテキスト注入で実現（機械学習・専用学習基盤を持ち込まない）。在庫は非永続でライフサイクルを持たない |
| II. 仕様駆動開発 | PASS | spec → plan の流れで進行。tasks/implement へ継続 |
| III. 意思決定は ADR に残す | PASS | 主要選定は ADR-04〜11 に記録済み。本 spec で新たな技術選定は発生しない |
| IV. AI が追従できるコンテキスト | PASS | 設計を specs/ に残し、agent context を更新 |
| V. AIエージェントが価値の中心 | PASS | Vercel AI SDK のツール駆動エージェントが中心。使い切り最適化・回避・好み反映をエージェント主導で実装。単なる検索/チャットボットにしない |

**フォローアップ**: なし。将来マルチエージェント等が必要になれば後続 ADR で再検討。

## Project Structure

### Documentation (this feature)

```text
specs/001-meal-plan-core/
├── plan.md              # 本ファイル（/speckit-plan 出力）
├── research.md          # Phase 0 出力（設計判断）
├── data-model.md        # Phase 1 出力（ドメインモデル＋保存マッピング）
├── quickstart.md        # Phase 1 出力（検証手順）
└── tasks.md             # Phase 2 出力（/speckit-tasks で作成）
# contracts/ は当面スキップ（YAGNI）。外部公開 API はチャット系エンドポイントのみで薄いため。必要になれば追加する。
```

### Source Code (repository root)

```text
src/
├── routes/                    # TanStack Start のルート（UI＋サーバー関数）
│   ├── __root.tsx             # ルートレイアウト
│   ├── index.tsx              # チャット主体の献立画面
│   └── api/                   # チャット/エージェント呼び出しのサーバー関数
├── server/
│   ├── agent/                 # Vercel AI SDK エージェント定義とツール群
│   │   ├── agent.ts           # 単一エージェント＋ツールループ
│   │   ├── tools/             # 在庫解釈・献立生成・買い物リスト・回避/好み更新・変更
│   │   └── context.ts         # ユーザー文脈（回避＋好み）をプロンプトへ注入
│   ├── services/              # ドメインロジック（献立計画・使い切り・日持ち・検証）
│   ├── db/                    # Drizzle スキーマ・クライアント（postgres.js）
│   │   ├── schema.ts
│   │   └── client.ts
│   └── model/                 # Gemini プロバイダのラッパ（タスク別モデル選択）
├── components/                # shadcn/ui ベースの UI（チャット・献立カード・買い物リスト・設定）
└── lib/                       # 共通ユーティリティ

tests/
├── unit/                      # ドメインロジック・ツールの単体テスト
└── integration/               # エージェント経由の統合テスト（回避0%・買い物リスト整合など）
```

**Structure Decision**: TanStack Start のフルスタック単一アプリ（単一 Cloud Run サービス）。UI は `src/routes` と `src/components`、エージェントとツールは `src/server/agent`、ドメインロジックは `src/server/services`、永続化は `src/server/db`。回避・好みの注入は `src/server/agent/context.ts` に集約する。

## Complexity Tracking

> Constitution Check に違反なし。記載不要。

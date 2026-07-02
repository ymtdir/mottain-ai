# 実装計画: 食材使い切り献立エージェント

**Branch**: `001-meal-plan-agent` | **Date**: 2026-07-03 | **Spec**: [spec.md](./spec.md)

**Input**: 機能仕様 `specs/001-meal-plan-agent/spec.md`

> 注記: 確定済みの技術前提 — 実行基盤 Cloud Run / Cloud SQL for PostgreSQL / Terraform / GitHub Actions CD（[ADR-04](../../docs/adr/04-infra-cloud-run.md)）、Web/フルスタックフレームワークに TanStack Start（TypeScript）（[ADR-05](../../docs/adr/05-web-framework-tanstack-start.md)）。**未確定** — エージェントの実装言語（ADK の Python か TypeScript か）は別 ADR で決める。

## Summary

チャットで在庫を把握し、世帯人数・アレルギー/苦手・好みを踏まえて、手持ち食材を無駄なく使い切る N 日分（1〜7日）の夕食献立と、不足分だけの買い物リストを提案する。提案の根拠を可視化し、チャットで修正でき、5段階評価＋任意コメント（味の感想）から好みと味付けを学習して最適化する。確定レシピは任意でイラスト生成する。

技術的アプローチ: エージェントを中心に据え、Gemini Enterprise Agent Platform（旧 Vertex AI）の **Agent Development Kit (ADK)** でツール利用・オーケストレーションを実装。Web/フルスタックは **TanStack Start（TypeScript・React・Vite）** で構築し、サーバー関数を BFF としてエージェント・DB に接続。ビルドした Node サーバを Docker 化して **Cloud Run** で動かす。永続化は Cloud SQL for PostgreSQL（JSON は JSONB）。ストリーミングチャットは Vercel AI SDK を利用。

## Technical Context

**Language/Version**: TypeScript（TanStack Start アプリ = UI ＋ サーバー関数）。エージェントは ADK（言語は別 ADR で確定: ADK-TS 埋め込み or Python ADK 別サービス）

**Primary Dependencies**: TanStack Start（Router・Query・Vite）／ ADK（`@google/adk` または `google-adk`）＝エージェント ／ Vercel AI SDK＝ストリーミングチャット ／ Gemini（テキスト）＋画像生成モデル（イラスト）

**Storage**: Cloud SQL for PostgreSQL（ADR-04）。JSON 形式のデータは JSONB 型で保持

**Testing**: Vitest（TypeScript：サーバー関数・UI・ドメインロジック）。エージェントを Python ADK にする場合は pytest を追加

**Target Platform**: Cloud Run（コンテナ、ゼロスケール）

**Project Type**: Web application（TanStack Start によるフルスタック単一アプリ。エージェントは埋め込み or 別サービス）

**Performance Goals**: 在庫入力開始から初回献立提案まで通常在庫で3分以内（SC-003）。チャット応答はストリーミングで体感的に即時

**Constraints**: Cloud Run の制約（実行時間上限・常駐不可）に収まる設計。コスト暴走の抑制 — LLM 呼び出しと画像生成の発火を制御（イラストは確定/明示要求時のみ＝FR-026、日数は1〜7日に制限＝FR-031）。アレルギー/苦手の混入は0%（SC-001、越えてはならない制約）

**Scale/Scope**: 個人〜小規模。単一ユーザー／単一世帯（MVP）。献立は夕食1食のみ

## Constitution Check

*GATE: Phase 0 前に通過必須。Phase 1 設計後に再確認する。*

| 原則 | 判定 | 根拠 |
|------|------|------|
| I. 軽量さ優先（YAGNI） | PASS | Cloud Run に載る最小構成。TanStack Start でフルスタックを1アプリに寄せる。追加プロダクト（キャッシュ/キュー等）は必要時に後続 ADR |
| II. 仕様駆動開発 | PASS | spec → plan の流れで進行。tasks/implement へ継続 |
| III. 意思決定は ADR に残す | PASS（一部フォロー） | インフラ=ADR-04、Web フレームワーク=ADR-05 を記録済み。残る「エージェント実装言語」は別 ADR で記録する |
| IV. AI が追従できるコンテキスト | PASS | 設計を specs/ とリポジトリに残し、agent context を更新 |
| V. AIエージェントが価値の中心 | PASS | ADK でエージェント中心設計。使い切り最適化・根拠可視化（FR-018）をエージェント主導で実装。単なる検索/チャットボットにしない |

**フォローアップ（ADR 化予定）**: エージェント実装言語（ADK-TS 埋め込み or Python ADK 別サービス）。成熟度（ADK-TS の永続セッション不足等）と単一言語のメリットを比較して決定する。

## Project Structure

### Documentation (this feature)

```text
specs/001-meal-plan-agent/
├── plan.md              # 本ファイル（/speckit-plan 出力）
├── research.md          # Phase 0 出力
├── data-model.md        # Phase 1 出力
├── quickstart.md        # Phase 1 出力
├── contracts/           # Phase 1 出力（API/サーバー関数コントラクト）
└── tasks.md             # Phase 2 出力（/speckit-tasks で作成）
```

### Source Code (repository root)

```text
src/                        # TanStack Start アプリ（UI ＋ サーバー関数）※既存 app/ の Python プレースホルダを置換
├── routes/                 # ルート（チャット・献立・買い物リスト・評価/コメント 画面）
├── server/                 # サーバー関数（BFF）
│   ├── agent/              # ADK エージェント定義とツール（ADK-TS 埋め込みの場合）
│   ├── services/           # 使い切り計画・分量算定・学習・在庫更新・ガードレール（決定的フィルタ）
│   └── db/                 # DB 接続・マイグレーション
├── components/             # UI（チャット・献立・買い物リスト・評価/コメント・根拠パネル）
└── lib/
tests/                      # Vitest

agent/                      # ※エージェントを Python ADK の別 Cloud Run サービスにする場合のみ（別 ADR で決定）

infra/terraform/            # 既存（ADR-04）。Cloud SQL 有効化・環境変数を本機能に合わせて拡張
Dockerfile                  # TanStack Start の Node サーバをコンテナ化（既存 app/ の Python プレースホルダを置換）
```

**Structure Decision**: TanStack Start によるフルスタック単一アプリ（`src/`）。UI とサーバー関数（BFF）を1つに置き、**Cloud Run は単一サービス**に保つ（YAGNI／運用の軽さ）。既存の Python プレースホルダ（`app/main.py` と `app/Dockerfile`）は TanStack Start アプリと Node 用 Dockerfile に置き換える。エージェントを Python ADK の別サービスにする選択をした場合のみ `agent/` を追加し2サービス構成にする（別 ADR で決定）。

## Complexity Tracking

> Constitution Check に未正当化の違反はない。原則 III は ADR-04・ADR-05 で主要な選定を記録済みで、残る「エージェント実装言語」を別 ADR で埋めるフォローアップのみ（違反ではなく手続き上の未完了）。

<!--
Sync Impact Report
- Version change: (template) → 1.0.0
- Ratification: 初回制定
- Principles:
  - I. 軽量さ優先（YAGNI）
  - II. 仕様駆動開発
  - III. 意思決定は ADR に残す
  - IV. AI が追従できるコンテキスト
- Added sections: Core Principles / Governance
- Removed sections: テンプレートの [SECTION_2_NAME] / [SECTION_3_NAME] プレースホルダを具体化
- Templates:
  - ✅ .specify/templates/plan-template.md（Constitution Check は原則と整合）
  - ✅ .specify/templates/spec-template.md（追加の必須制約なし）
  - ✅ .specify/templates/tasks-template.md（原則由来のタスク種別追加なし）
  - ✅ AGENTS.md（具体的な開発ワークフローの手順を保持。原則は本 constitution を参照）
- Deferred TODOs: なし
-->

# mottain-ai Constitution

## Core Principles

### I. 軽量さ優先（YAGNI）

個人開発・ハッカソンの規模に見合わない過剰な仕組みを持ち込んではならない（MUST NOT）。重厚なフレームワークより最小構成を選び、必要になってから足す。仕組み・依存・抽象を追加するときは、その時点で必要な理由を説明できること（MUST）。

### II. 仕様駆動開発

新機能は Spec Kit のフロー（spec → plan → tasks → implement）で進める（MUST）。バグ修正・UI 改善・リファクタリング・小さな機能追加など、仕様を立てる必要のない単発の変更は github-toolkit（issue → resolve → PR）で対応する（SHOULD）。

### III. 意思決定は ADR に残す

技術・アーキテクチャの選定は、検討した代替案とその不採用理由とともに `docs/adr/` に ADR として記録する（MUST）。作成は `create-adr` スキルで形式を統一する。

### IV. AI が追従できるコンテキスト

規約・方針はリポジトリ内のテキストに残し、`AGENTS.md` を起点とする段階的開示で AI エージェントが参照できる状態を保つ（MUST）。エージェント固有の設定ファイルは共通ハブ（AGENTS.md）を参照する形にとどめ、内容を分散させない（SHOULD）。

## Governance

本 constitution はプロジェクトの他の慣行に優先する。改定は semver（MAJOR: 原則の削除・非互換な再定義 / MINOR: 原則・節の追加や大幅な拡張 / PATCH: 表現の明確化）で版管理し、重要な方針転換は ADR に記録する。個人開発のため、改定の承認は自己確認とする。

**Version**: 1.0.0 | **Ratified**: 2026-07-02 | **Last Amended**: 2026-07-02

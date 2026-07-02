<!--
Sync Impact Report
- Version change: 1.0.0 → 1.1.0
- Bump rationale: MINOR（原則の追加「V. AIエージェントが価値の中心」と新節「プロダクト前提」の追加）
- Ratification: 据え置き（2026-07-02）
- Principles:
  - I. 軽量さ優先（YAGNI）
  - II. 仕様駆動開発
  - III. 意思決定は ADR に残す
  - IV. AI が追従できるコンテキスト
  - V. AIエージェントが価値の中心（新規追加）
- Added sections: プロダクト前提（新規）
- Removed sections: なし
- Templates:
  - ✅ .specify/templates/plan-template.md（Constitution Check はファイル参照の汎用ゲート。原則と整合）
  - ✅ .specify/templates/spec-template.md（constitution 参照なし。追加の必須制約なし）
  - ✅ .specify/templates/tasks-template.md（constitution 参照なし。原則由来のタスク種別追加なし）
  - ✅ AGENTS.md（開発ワークフローの手順を保持。原則は本 constitution を参照）
- Deferred TODOs: なし
- Notes: ガードレール（アレルギー混入防止・コスト暴走抑制）は constitution に含めない。各機能の spec で定義する。
-->

# mottain-ai Constitution

## プロダクト前提

mottain-ai は、AIエージェントとのチャットを通じて指定した日数分の献立と買い物リストを提案し、手持ちの食材を無駄なく使い切ることを狙う献立アプリである。GCP にデプロイして提出するハッカソン作品であり、まずは Web アプリとして構築する（モバイル対応は任意）。AI コアには Google Cloud の Gemini Enterprise Agent Platform（旧 Vertex AI）および Gemini を用いることを想定する。本節は前提の共有であり、具体プロダクトの採用を縛る規範ではない（技術選定は「III. 意思決定は ADR に残す」に従う）。

## Core Principles

### I. 軽量さ優先（YAGNI）

個人開発・ハッカソンの規模に見合わない過剰な仕組みを持ち込んではならない（MUST NOT）。重厚なフレームワークより最小構成を選び、必要になってから足す。仕組み・依存・抽象を追加するときは、その時点で必要な理由を説明できること（MUST）。

### II. 仕様駆動開発

新機能は Spec Kit のフロー（spec → plan → tasks → implement）で進める（MUST）。バグ修正・UI 改善・リファクタリング・小さな機能追加など、仕様を立てる必要のない単発の変更は github-toolkit（issue → resolve → PR）で対応する（SHOULD）。

### III. 意思決定は ADR に残す

技術・アーキテクチャの選定は、検討した代替案とその不採用理由とともに `docs/adr/` に ADR として記録する（MUST）。作成は `create-adr` スキルで形式を統一する。

### IV. AI が追従できるコンテキスト

規約・方針はリポジトリ内のテキストに残し、`AGENTS.md` を起点とする段階的開示で AI エージェントが参照できる状態を保つ（MUST）。エージェント固有の設定ファイルは共通ハブ（AGENTS.md）を参照する形にとどめ、内容を分散させない（SHOULD）。

### V. AIエージェントが価値の中心

本プロダクトの価値の中心は AIエージェントである（MUST）。単なるレシピ検索やチャットボットに退行させてはならない（MUST NOT）。エージェントは自律的に判断し、必要なツールを利用して、献立全体で食材の使い切りを最適化する（MUST）。加えて、エージェントが「何を根拠にその献立にしたか」を利用者が追える透明性を備える（MUST）。特定ベンダー・プロダクトの採用そのものは本原則で固定せず、技術選定は「III. 意思決定は ADR に残す」に従う（SHOULD）。

## Governance

本 constitution はプロジェクトの他の慣行に優先する。改定は semver（MAJOR: 原則の削除・非互換な再定義 / MINOR: 原則・節の追加や大幅な拡張 / PATCH: 表現の明確化）で版管理し、重要な方針転換は ADR に記録する。個人開発のため、改定の承認は自己確認とする。

**Version**: 1.1.0 | **Ratified**: 2026-07-02 | **Last Amended**: 2026-07-03

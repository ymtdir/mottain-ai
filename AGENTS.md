# AGENTS.md

このプロジェクトの規約・開発フローの概要。詳細は各参照先を確認すること。

## 開発フロー

### 機能開発（Spec Kit）

新機能は Spec Kit のフェーズに沿って進める:

1. `/speckit-specify` — 仕様を作成
2. `/speckit-clarify` — 曖昧な点を詰める（任意）
3. `/speckit-plan` — 実装計画を生成
4. `/speckit-tasks` — タスク一覧を生成
5. `/speckit-implement` — 実装

### 単発の変更（github-toolkit）

バグ修正・UI 改善・リファクタリング・小さな機能追加など、仕様を立てる必要のない作業は github-toolkit で対応する:

1. `/create-issue` — Issue を起票
2. `/resolve-issue` — ブランチを切って実装・コミット
3. `/create-pr` — PR を作成

## コミット規約

→ [`.claude/rules/commit-conventions.md`](.claude/rules/commit-conventions.md)

## 技術選定の記録（ADR）

技術・アーキテクチャ上の決定は `docs/adr/` に ADR として残す。作成は `/create-adr` で行う。

→ [`docs/adr/`](docs/adr/)

---
name: create-issue
description: Create a GitHub Issue from a free-form description. Use when told "create an issue" or "file this as an issue". Drafts a title and body, confirms with the user, then creates it unlabeled.
argument-hint: <Issue説明>
---

# Issue作成スキル

開発中に発見した問題や要望をGitHub Issueとして記録する。個人開発向けの軽量版 — ラベル分類は行わない。

## 入力仕様

- **Issue説明**: 必須。ユーザーの自由形式の入力をそのままIssue内容として扱う。

## Issue作成プロセス

### ステップ1: ドラフトの作成

Issue説明の内容を判定し、テンプレートを選ぶ:

- エラー・不具合・意図しない動作の報告 → `assets/bug-template.md`（概要＋再現手順）
- それ以外すべて → `assets/template.md`（概要＋詳細）

プレースホルダー（`[...]`）を実際の値に置き換えてタイトルとIssue本文のドラフトを作成する。タイトルは50文字以内の1行。

### ステップ2: ユーザー確認

作成したドラフトをそのまま提示し、ユーザーの承認を待つ。修正依頼があれば反映して再提示する。承認が得られるまで `gh issue create` は実行しない。

### ステップ3: GitHub Issueの作成

`gh auth status` が未認証の場合は `gh auth login` を促して終了する。

認証済みの場合、承認されたドラフトで作成する:

```bash
gh issue create \
  --title "<issueタイトル>" \
  --body "$(cat <<'EOF'
<承認されたIssue本文>
EOF
)"
```

ユーザーがラベル名を明示的に指定した場合のみ `--label` を追加する（既定はラベルなし）。
`--assignee` / `--milestone` / `--project` も同様に、明示的に要求された場合のみ追加する。

## 出力仕様

`gh issue create` の出力URLを1行で報告する:

```
Issue #[番号] を作成しました: [GitHub Issue URL]
```

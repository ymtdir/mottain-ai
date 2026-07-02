---
name: create-pr
description: Create a Pull Request from changes on the current branch. Use when asked to "create a PR", "open a pull request", or "submit changes for review". Drafts a title and body, confirms with the user, then creates it unlabeled.
---

# Pull Request作成スキル

現在のブランチの変更を分析してGitHub Pull Requestを作成する。個人開発向けの軽量版 — ラベルは付けない。

## 入力仕様

- 引数なし。現在のブランチを対象に処理する。
- `main` / `master` ブランチ上、または `origin/main` との差分がない場合は中断し、ユーザーに知らせる。

## PR作成プロセス

### ステップ1: ブランチ情報の収集

```bash
git branch --show-current
git diff --stat origin/main...HEAD
git log origin/main..HEAD --oneline
git diff --name-only origin/main...HEAD
```

関連Issueがあれば番号を検出する: コミットメッセージの `#\d+`。見つからなければ関連Issueなしとして扱う（ステップ3のドラフト確認時にユーザーが追記してもよい）。

### ステップ2: ドラフトの作成

変更内容を判定し、テンプレートを選ぶ:

- エラー・不具合の修正 → `assets/bug-template.md`（概要＋修正内容）
- それ以外すべて → `assets/template.md`（概要＋変更内容）

プレースホルダー（`[...]`）を実際の値に置き換えてPRタイトルと本文のドラフトを作成する。

- タイトルはコミットプレフィックス（`fix:` / `feat:` など、詳細は `../../rules/commit-conventions.md`）付きの50文字以内の1行。
- 関連Issueがなければ本文の `## 関連Issue` セクションを削除する。

### ステップ3: ユーザー確認

作成したドラフトをそのまま提示し、ユーザーの承認を待つ。修正依頼があれば反映して再提示する。承認が得られるまでプッシュ・PR作成は行わない。

### ステップ4: プッシュとPRの作成

`gh auth status` が未認証の場合は `gh auth login` を促して終了する。

認証済みの場合、ブランチをプッシュしてPRを作成する:

```bash
git push -u origin HEAD

gh pr create \
  --base main \
  --title "<PRタイトル>" \
  --body "$(cat <<'EOF'
<承認されたPR本文>
EOF
)"
```

ユーザーがラベル名を明示的に指定した場合のみ `--label` を追加する（既定はラベルなし）。

## 出力仕様

`gh pr create` の出力URLを1行で報告する:

```
PR #[番号] を作成しました: [GitHub PR URL]
```

レビューは `/code-review --comment [番号]` で実行できる。

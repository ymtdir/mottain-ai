---
name: resolve-issue
description: Resolve a GitHub Issue by creating a branch and making atomic commits. Use when told "resolve Issue #42", "do Issue 42", etc. Flow: analyze Issue → create branch → atomic commits → quality check.
argument-hint: '#<Issue番号>'
---

# Issue解決スキル

GitHub Issueを読み取り、専用ブランチ上で解決する。個人開発向けの軽量版。

## 入力仕様

- **Issue番号**: 必須。引数またはユーザーの発話から `#\d+` または数字で取得する。取得できない場合はユーザーに尋ねる。

## 手順

### ステップ1: Issueの分析

```bash
gh issue view [番号]
```

本文からやるべきことを把握する。本文だけで判断できない場合のみ `gh issue view [番号] --comments` でコメントも読む。

### ステップ2: ブランチの作成

ブランチ名は `<type>/<説明>` 形式。

- `<type>`: 作業内容に合う一般的なプレフィックス。バグ修正は `fix/`、新規機能は `feature/`、その他は `refactor/` / `docs/` / `chore/` など。
- `<説明>`: kebab-case で2〜4語（例: `empty-email`、`mau-chart`）。

例: `fix/empty-email`、`feature/mau-chart`

作成前に同名ブランチを確認する:

```bash
git branch --list "<type>/<説明>"
```

既存ブランチがあれば処理を止め、再利用するか別名で作るかをユーザーに確認する。なければ作成する:

```bash
git checkout -b <type>/<説明>
```

### ステップ3: 作業単位での解決

**各タスク完了ごとにすぐコミットする。** コミット規約は `../../rules/commit-conventions.md` に従う。

```bash
git add [変更ファイル]
git commit -m "feat: [説明]"
```

### ステップ4: 品質チェック

`package.json` の `scripts` を読み取り、存在するもののみ実行する（test → lint → typecheck の順）:

```bash
npm test          # scripts.test がある場合
npm run lint      # scripts.lint がある場合
npm run typecheck # scripts.typecheck がある場合。なければ npx tsc --noEmit
```

`pnpm` / `yarn` プロジェクトは読み替える。失敗した場合は原因を修正して再実行する。修正しても失敗が続く場合はユーザーに詳細を提示し、修正方針の承認を待つ。

## 責任範囲

このスキルは**品質チェックまで**。`git push` やPR作成は含まず、PRは `create-pr` スキルに委譲する。

## 出力仕様

完了後、簡潔に報告する:

- **成功**: `Issue #[番号] を解決しました。ブランチ: <type>/[説明] / コミット [n]件 / テスト OK。create-pr でPRを作成できます。`
- **テスト失敗**: 失敗したチェック（test / lint / typecheck）と要点を伝え、修正方針の承認を待つ。

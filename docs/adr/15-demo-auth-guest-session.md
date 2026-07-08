# 15. デモ環境用認証に「環境変数管理の単一ゲストアカウント＋HMAC 署名セッション Cookie」を採用する

- status: Accepted
- date: 2026-07-08

## コンテキストと課題

本プロジェクトはハッカソン提出作品で、審査員が実際に触れる必要がある（憲章の前提）。これまで認証は無く、`FIXED_USER_ID` で単一ユーザーを固定していた。デモ発表に向けて「誰でもすぐログインして試せる」入口が要るが、本格的なユーザー登録・複数ユーザー対応は別 Issue に切り出しており、いまは**ゲスト1アカウントでログインできれば足りる**。制約は「単一ユーザー・ハッカソン規模で新 GCP インフラを増やさない」「ログイン画面は自前で作り込みたい（デモの見栄え）」「Google アカウントは使わず、汎用のゲスト資格でログインさせたい」の 3 点。

## 検討した選択肢

- 環境変数管理の単一ゲストアカウント＋自前の HMAC 署名セッション Cookie（採用）
- Identity-Aware Proxy（IAP）でインフラ層認証
- GCP Identity Platform（Firebase Auth）でメール＋パスワード認証

## 決定

**環境変数で単一ゲストアカウントを管理し、自前の HMAC 署名セッション Cookie で認証する。**

`DEMO_EMAIL` / `DEMO_PASSWORD` を環境変数に持ち、`POST /api/auth/login` で照合（タイミング安全比較）。成功時に `SESSION_SECRET` で HMAC-SHA256 署名したトークンを httpOnly・SameSite=Lax の Cookie で発行する。`__root.tsx` の `beforeLoad` で全ルートを保護し、未認証は `/login` へリダイレクト。ログイン画面は DESIGN.md のトークンで自前実装する。外部ライブラリ（iron-session / jose 等）や新 GCP サービスは追加しない。

### 理由

- 単一ゲストアカウントという要件に最短で一致し、依存も新インフラもゼロ（憲章 I）。
- 自前のログイン UI が作れる（IAP は Google の OAuth 画面に固定される）。
- Node 標準 `crypto` の HMAC 署名だけでセッションの改ざん・期限切れを検証でき、DB セッションテーブルも外部サービスも不要。
- デモ用の割り切り（資格情報を env var で管理）を明示的に受け入れられる。

## 各選択肢の比較

### 環境変数ゲスト＋HMAC 署名 Cookie（採用）

- 👍 良い点: 依存・新インフラ不要／ログイン画面を自前で作れる／Google アカウント不要でゲスト資格のまま配れる／実装が数十行
- 👎 懸念点: 資格情報が env var 管理でローテーションが手動／複数ユーザー・登録フローは持てない（別 Issue 前提）／署名鍵漏洩時は全セッション無効化が必要

### Identity-Aware Proxy（IAP）（不採用）

- 👍 良い点: アプリのコード改変ゼロ／インフラ層で堅牢／許可アカウントを IAM で 1 件に絞れる
- 👎 不採用の理由: ログイン画面が Google の OAuth 画面に固定され自前 UI を作れない／「Google ではなくゲスト資格で」という要件に反する／IAP 有効化の GCP 設定が要る

### GCP Identity Platform / Firebase Auth（不採用）

- 👍 良い点: 本格認証への発展性／メール＋パスワードや各種プロバイダに対応
- 👎 不採用の理由: デモ 1 アカウントには過剰（YAGNI・憲章 I）／新 GCP サービスと SDK 依存が増える／セットアップ工数が要件に見合わない。**本格認証が必要になれば移行する upgrade path** とする

## 結果

- 新インフラ・新依存ゼロでデモ用ログインを実現。審査員はゲスト資格ですぐ試せる。
- 実装は `src/server/services/auth.ts`（署名・照合）／`auth-check.ts`（`createServerFn` での検証）／`/api/auth/{login,logout}`／`/login`／`__root.tsx` のガードに閉じる。
- 必要な環境変数: `DEMO_EMAIL` / `DEMO_PASSWORD` / `SESSION_SECRET`。
- トレードオフと将来: 本格的なユーザー登録・複数ユーザー・パスワードハッシュ保存（bcrypt/argon2）や外部 IdP は別 Issue で扱い、その際は本 ADR を Superseded にする。`FIXED_USER_ID` 前提のサービス層は当面据え置く。

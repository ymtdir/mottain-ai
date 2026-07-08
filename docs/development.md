# 開発ガイド

ローカル開発環境のセットアップと、インフラ・デプロイの手順をまとめる。アプリの概要は [README](../README.md) を参照。

## 開発コマンド

```sh
pnpm install       # 依存パッケージをインストール
pnpm dev           # 開発サーバー起動 (http://localhost:3000)
pnpm build         # プロダクションビルド
pnpm typecheck     # 型チェック
pnpm lint          # ESLint
pnpm format        # Prettier（フォーマット適用）
pnpm test          # Vitest（単体・統合テスト）
```

## ローカル開発環境の初回セットアップ

### 1. PostgreSQL を起動する

```sh
docker compose up -d
```

接続情報: `postgresql://mottain-ai:mottain-ai@localhost:5432/mottain-ai`

### 2. 環境変数を設定する

`.env.example` をコピーして `.env.local` を作成し、値を埋める。

```sh
cp .env.example .env.local
```

| 変数名                  | 説明                                                | 例                                                             |
| ----------------------- | --------------------------------------------------- | -------------------------------------------------------------- |
| `DATABASE_URL`          | PostgreSQL 接続文字列                               | `postgresql://mottain-ai:mottain-ai@localhost:5432/mottain-ai` |
| `GOOGLE_CLOUD_PROJECT`  | Gemini を使う GCP プロジェクト ID                   | `mottain-ai`                                                   |
| `GOOGLE_CLOUD_LOCATION` | Vertex AI のリージョン（省略時: `asia-northeast1`） | `asia-northeast1`                                              |

### 3. Vertex AI API を有効化する（初回のみ）

```sh
gcloud services enable aiplatform.googleapis.com --project=<プロジェクトID>
```

### 4. Google Cloud 認証（ADC）を設定する

```sh
gcloud auth application-default login
gcloud auth application-default set-quota-project <プロジェクトID>
```

### 5. DB マイグレーションを実行する

```sh
pnpm drizzle-kit migrate    # DB に適用（drizzle/ 以下のファイルを順に実行）
```

## Spec Kit

プロジェクトルートで以下を実行する:

```sh
uvx specify init .
```

プロンプトでは以下を選択する:

- 使用するAIアシスタント
- スクリプトタイプ

---

## インフラ / デプロイ

インフラは Terraform で管理し（`infra/terraform/`）、`main` への push で GitHub Actions が Cloud Run へ自動デプロイする。設計判断は [`docs/adr/04-infra-cloud-run.md`](adr/04-infra-cloud-run.md) を参照。

### 前提

- `gcloud`（認証済み）、`terraform`（tfenv 等）、`docker`
- GCP プロジェクト `mottain-ai`（課金有効）

### ブートストラップ（初回のみ）

```sh
# 操作対象プロジェクトと Terraform 用の認証（ADC）
gcloud config set project mottain-ai
gcloud auth application-default login
gcloud auth application-default set-quota-project mottain-ai

# state 用バケットを作成（versions.tf の backend と名前を合わせる）
gcloud storage buckets create gs://mottain-ai-tfstate --location=asia-northeast1
```

### Terraform の適用

```sh
cd infra/terraform
cp terraform.tfvars.example terraform.tfvars   # 必要なら値を編集
terraform init
terraform plan
terraform apply
```

DB が必要になったら `terraform.tfvars` の `enable_cloud_sql = true` にして再度 `apply` する。

### CD の有効化（初回のみ）

`terraform apply` の出力値を GitHub の Actions Variables に登録する（Settings → Secrets and variables → Actions → Variables）。

| 変数名         | 値の取得元（terraform output） |
| -------------- | ------------------------------ |
| `WIF_PROVIDER` | `workload_identity_provider`   |
| `DEPLOYER_SA`  | `deployer_service_account`     |

以降、`main` への push で `app/` のイメージがビルド・push され、Cloud Run へデプロイされる。

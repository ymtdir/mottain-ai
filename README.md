# mottain-ai

食材を無駄にしない献立づくりを、AI エージェントとのチャットで実現する Web アプリ。

「冷蔵庫にじゃがいもと人参がある。3日分の夕食を考えて」——そのような自然な一言から、手持ち食材を使い切る献立と、不足分だけの買い物リストを提案する。

## 特徴

- **使い切り最適化**: 手持ち食材が余らないよう、献立全体で使い切りを優先する
- **ガードレール**: アレルギー・苦手食材は絶対に混入しない
- **透明性**: 提案の根拠（使い切り対象・回避食材・好み反映）を常に確認できる
- **好みの学習**: 「パンチが足りない」などの抽象的な感想から具体的な改善を提示し、次回に反映する
- **余剰の持ち越し**: 買い物リストより多く買った分は次回の手持ちとして自動持ち越し

GCP ハッカソン作品。AI コアは Gemini Enterprise Agent Platform / Gemini を使用。

---

## セットアップ

### Spec Kit

プロジェクトルートで以下を実行する:

```sh
uvx specify init .
```

プロンプトでは以下を選択する:

- 使用するAIアシスタント
- スクリプトタイプ

## インフラ / デプロイ

インフラは Terraform で管理し（`infra/terraform/`）、`main` への push で GitHub Actions が Cloud Run へ自動デプロイする。設計判断は [`docs/adr/04-infra-cloud-run.md`](docs/adr/04-infra-cloud-run.md) を参照。

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

| 変数名         | 値の取得元（terraform output）        |
| -------------- | ------------------------------------- |
| `WIF_PROVIDER` | `workload_identity_provider`          |
| `DEPLOYER_SA`  | `deployer_service_account`            |

以降、`main` への push で `app/` のイメージがビルド・push され、Cloud Run へデプロイされる。

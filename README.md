# mottain-ai

食材を無駄にしない献立づくりを、AI エージェントとのチャットで実現する Web アプリ。

「冷蔵庫にじゃがいもと人参がある。3日分の夕食を考えて」——そのような自然な一言から、手持ち食材を使い切る献立と、不足分だけの買い物リストを提案する。

## 解決する課題

- 冷蔵庫の食材をどう使い切るか考えるのが面倒
- 献立を考えるのに時間がかかる
- 何を買い足せばいいかわからない
- アレルギーや苦手食材を毎回気にしながら考えるのが手間

## ターゲット

家庭で食事を作る個人・世帯（MVP: 単一ユーザー・単一世帯）。

## コアバリュー

**AI エージェントが価値の中心**。単なるレシピ検索やチャットボットではなく、エージェントが自律的に判断・ツールを活用し、献立全体で食材の使い切りを最適化する。提案の根拠（どの食材を使い切ろうとしているか、何を避けているか、どの好みを反映したか）をユーザーが追えることで信頼性を担保する。

## MVP スコープ

- チャットで在庫（食材・調味料）を自然な発話で伝えると、エージェントが構造化して把握する
- 指定した日数分（1〜7日）の夕食献立と、手持ちで不足するぶんだけの買い物リストを提案する
- アレルギー・苦手食材は絶対に混入しない（ガードレール）
- 世帯人数・子供の年齢帯に合わせた分量
- チャットで献立を修正・改善できる
- 提案の根拠（使い切り対象・回避食材・好み反映）を確認できる
- 5段階評価と味の感想（「パンチが足りない」など抽象的なコメントも可）から好みを学習し、提案を最適化する
- 気に入ったレシピを保存できる
- レシピのイラストを生成できる（確定または明示要求時のみ——試行錯誤中の無駄な再生成を避ける）

## MVP 対象外

- 朝食・昼食・3食対応（夕食のみ）
- 複数世帯・ユーザー管理
- 栄養計算・カロリー管理
- 在庫ごとの消費期限管理（一般的な日持ちのみ考慮）
- モバイルアプリ（Web のみ。モバイル最適化は余裕があれば任意）

## 差別化ポイント

| ポイント       | 内容                                                                                           |
| -------------- | ---------------------------------------------------------------------------------------------- |
| 透明性         | 提案の根拠を常に確認できる。なぜこの献立なのかがわかる                                         |
| ガードレール   | アレルギー・苦手食材は使い切り最適化や好みより優先され、絶対に混入しない                       |
| 好みの学習     | 「パンチが足りない」などの抽象的な感覚から具体的な改善案（調味料・分量の調整）を提示し学習する |
| 余剰の持ち越し | 買い物リストより多く買った分は次回の手持ち在庫として自動的に持ち越される                       |

## プロダクト前提

- GCP ハッカソン作品。デプロイ先は Cloud Run（[ADR-04](docs/adr/04-infra-cloud-run.md)）
- Web アプリとして提供する。モバイル対応は範囲外（余裕があれば任意）
- AI コアは Gemini Enterprise Agent Platform / Gemini を使用（[ADR-06](docs/adr/06-ai-core-gemini-enterprise-agent-platform.md)）
- 過剰な作り込みを避け、個人開発で回せる軽さを保つ（[開発憲章](.specify/memory/constitution.md) 原則 I）

---

## 開発

```sh
pnpm install       # 依存パッケージをインストール
pnpm dev           # 開発サーバー起動 (http://localhost:3000)
pnpm build         # プロダクションビルド
pnpm typecheck     # 型チェック
pnpm lint          # ESLint
pnpm format        # Prettier（フォーマット適用）
pnpm test          # Vitest（単体・統合テスト）
```

### ローカル開発環境の初回セットアップ

#### 1. PostgreSQL を起動する

```sh
docker compose up -d
```

接続情報: `postgresql://mottain-ai:mottain-ai@localhost:5432/mottain-ai`

#### 2. 環境変数を設定する

`.env.example` をコピーして `.env.local` を作成し、値を埋める。

```sh
cp .env.example .env.local
```

| 変数名 | 説明 | 例 |
| --- | --- | --- |
| `DATABASE_URL` | PostgreSQL 接続文字列 | `postgresql://mottain-ai:mottain-ai@localhost:5432/mottain-ai` |
| `GOOGLE_CLOUD_PROJECT` | Gemini を使う GCP プロジェクト ID | `mottain-ai` |
| `GOOGLE_CLOUD_LOCATION` | Vertex AI のリージョン（省略時: `asia-northeast1`） | `asia-northeast1` |

#### 3. Vertex AI API を有効化する（初回のみ）

```sh
gcloud services enable aiplatform.googleapis.com --project=<プロジェクトID>
```

#### 4. Google Cloud 認証（ADC）を設定する

```sh
gcloud auth application-default login
gcloud auth application-default set-quota-project <プロジェクトID>
```

#### 5. DB マイグレーションを実行する

```sh
pnpm drizzle-kit migrate    # DB に適用（drizzle/ 以下のファイルを順に実行）
```

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

| 変数名         | 値の取得元（terraform output） |
| -------------- | ------------------------------ |
| `WIF_PROVIDER` | `workload_identity_provider`   |
| `DEPLOYER_SA`  | `deployer_service_account`     |

以降、`main` への push で `app/` のイメージがビルド・push され、Cloud Run へデプロイされる。

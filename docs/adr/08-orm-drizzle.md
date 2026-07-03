# 08. ORM / DB アクセスに Drizzle を採用する

- status: Accepted
- date: 2026-07-03

## コンテキストと課題

データストアは Cloud SQL for PostgreSQL（[ADR-04](04-infra-cloud-run.md)）、アプリは TypeScript（[ADR-05](05-web-framework-tanstack-start.md) / [ADR-07](07-agent-framework-vercel-ai-sdk.md)）。この TS から DB を扱う ORM / データアクセス層を決める。ドメインモデル（data-model.md）はリレーショナルな実体に加え、可変な構造（回避制約・好みプロファイル・根拠・会話・味の感想）を JSONB で持つ方針。個人開発・ハッカソンの軽さ（constitution 原則 I）を踏まえる。

## 検討した選択肢

- Drizzle（採用）
- Prisma
- Kysely
- 生 SQL（postgres.js を直接）

## 決定

ORM / DB アクセスに Drizzle ORM を採用する。マイグレーションは drizzle-kit、Postgres ドライバは postgres.js（`postgres`）を用いる。スキーマは `src/server/db/schema.ts` に定義する。

### 理由

- 軽量・SQL 寄り・型安全で、スキーマ定義から型付きクエリ・マイグレーション（drizzle-kit）まで単体で完結する。別 ORM は不要。
- JSONB を型付きで扱え、data-model の JSONB 実体に素直に対応できる。
- ランタイムが薄く Cloud Run のコールドスタートに軽い。TypeScript で一気通貫。

## 各選択肢の比較

### Drizzle（採用）

- 👍 良い点: 軽量・型安全 / SQL に近く学習コストが低い / drizzle-kit で移行完結 / JSONB を型付きで扱える / コールドスタートに軽い
- 👎 懸念点: リレーションのクエリ API は `relations()` 定義が要る（規模的には軽微）/ Cloud Run→Cloud SQL 接続は別途ソケット/コネクタ設定が必要（Drizzle 起因ではない）

### Prisma

- 👍 良い点: 成熟・高機能で、スキーマ DSL が読みやすい
- 👎 不採用の理由: クエリエンジン/コード生成で重く、Cloud Run のコールドスタートに不利。今回の軽さ（YAGNI）に対して過剰

### Kysely

- 👍 良い点: 型安全なクエリビルダで最軽量
- 👎 不採用の理由: マイグレーション基盤が別途必要で、スキーマ→移行の一体感が Drizzle に劣る

### 生 SQL（postgres.js を直接）

- 👍 良い点: 依存最小・透明
- 👎 不採用の理由: 型付けと定型コード（マッピング・移行）を自前で書く量が増える

## 結果

- スキーマを `src/server/db/schema.ts` に集約し、drizzle-kit で移行を生成・適用、postgres.js で接続する。
- JSONB 実体（回避制約・好みプロファイル・根拠・会話・味の感想）を型付きカラムで持てる。
- Cloud Run から Cloud SQL への接続は Unix ソケット/コネクタ経由を db client 設定で扱う（本 ADR の範囲外の運用詳細）。

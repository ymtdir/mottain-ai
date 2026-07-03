# プロジェクト構造

## 方針

- **コロケーション優先**: テストはソースの隣に置く（`*.test.ts` を同ディレクトリに）
- **統合テストのみ** `src/server/__tests__/` にまとめる（複数モジュールをまたぐため）
- `components/ui/` は shadcn が管理する領域。手動編集しない

## ディレクトリ構成

```
src/
├── routes/                        # TanStack Start のルート（UI + サーバー関数）
│   ├── __root.tsx                 # ルートレイアウト
│   ├── index.tsx                  # チャット画面
│   └── api/
│       └── chat.ts                # ストリーミングチャットのサーバー関数
│
├── server/                        # サーバー専用（クライアントから import しない）
│   ├── agent/
│   │   ├── agent.ts               # Vercel AI SDK 単一エージェント + ツールループ
│   │   ├── context.ts             # 回避・好みをプロンプトへ注入
│   │   └── tools/
│   │       ├── *.ts               # ツール実装
│   │       └── *.test.ts          # ← コロケーション（単体テスト）
│   ├── services/
│   │   ├── *.ts                   # ドメインロジック（決定的なコード）
│   │   └── *.test.ts              # ← コロケーション（単体テスト）
│   ├── db/
│   │   ├── schema.ts              # Drizzle スキーマ
│   │   └── client.ts              # postgres.js + Drizzle クライアント
│   ├── model/
│   │   └── gemini.ts              # Gemini プロバイダラッパ（@ai-sdk/google-vertex）
│   ├── lib/
│   │   └── errors.ts              # 内部エラー定義
│   └── __tests__/
│       └── *.test.ts              # 統合テスト（複数モジュールをまたぐもの）
│
├── components/
│   ├── ui/                        # shadcn 管理領域（触らない）
│   ├── chat/                      # チャット UI パーツ
│   ├── meal-plan/                 # 献立カード・買い物リスト表示
│   └── settings/                  # 回避食材設定 UI
│
└── lib/
    └── utils.ts                   # 既存（shadcn の cn() 等）
```

## 認証・環境変数

| 変数 | 用途 | ローカル | Cloud Run |
|------|------|----------|-----------|
| `DATABASE_URL` | Cloud SQL 接続文字列 | `.env.local` に記載 | 環境変数として設定 |
| `GOOGLE_CLOUD_PROJECT` | GCP プロジェクト ID | `.env.local` に記載 | 環境変数として設定 |
| `GOOGLE_CLOUD_LOCATION` | Vertex AI リージョン（`asia-northeast1`） | `.env.local` に記載 | 環境変数として設定 |

Gemini（Gemini Enterprise Agent Platform / Vertex AI）の認証は ADC を使う。API キーは不要。

- **ローカル**: `gcloud auth application-default login`
- **Cloud Run**: サービスアカウントに `Vertex AI User` ロールを付与

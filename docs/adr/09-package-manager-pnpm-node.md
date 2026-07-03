# 09. パッケージマネージャ/ランタイムに pnpm + Node を採用する

- status: Accepted
- date: 2026-07-03

## コンテキストと課題

アプリは TypeScript スタック（[ADR-05](05-web-framework-tanstack-start.md) / [ADR-07](07-agent-framework-vercel-ai-sdk.md)）で、ビルド系（Vite・TanStack Start プラグイン・drizzle-kit）はいずれも Node ファースト。デプロイ先は Cloud Run（[ADR-04](04-infra-cloud-run.md)）。パッケージマネージャとランタイムを決める。個人開発・ハッカソンで、基盤のツールで詰まらず実装に時間を割きたい。

## 検討した選択肢

- pnpm + Node（採用）
- npm + Node
- Bun（パッケージマネージャ＋ランタイム一体）

## 決定

パッケージマネージャに pnpm、ランタイムに Node を採用する。`pnpm-lock.yaml` をコミットし、Cloud Run 用のコンテナは Node ベースイメージでビルド・起動する。

### 理由

- npm より install が高速・省ディスクで、ランタイムは Node のまま堅い。
- pnpm は npm 互換性が高く、ビルド系（Vite・TanStack Start・drizzle-kit）をそのまま動かせる。
- Cloud Run × Node は最も枯れたデプロイ経路で、既存 Dockerfile・CD（GitHub Actions）との整合をそのまま保てる。
- Bun に比べてビルドツール起因の不確実性がなく、ハッカソンで詰まるリスクを最小化できる。

## 各選択肢の比較

### pnpm + Node（採用）

- 👍 良い点: npm より install 高速・省ディスク / ランタイムは Node のまま堅い / npm 互換で全ビルドツールが動く / `pnpm-lock.yaml` で再現性が高い / 広く採用実績あり
- 👎 懸念点: npm ほど「デフォルト」ではないが、主要プロジェクトでの採用実績は十分

### npm + Node

- 👍 良い点: 最大互換・枯れている / Node の標準バンドル
- 👎 不採用の理由: install がやや遅い / pnpm と同等の堅さでありながら速度・ディスク効率で劣る。pnpm を選ばない積極的な理由が薄い

### Bun（PM＋ランタイム）

- 👍 良い点: install/実行が速く、PM・ランタイム・テストが一体。TS を直接実行できる DX
- 👎 不採用の理由: ビルド系が Node 前提のため相性リスクがビルド周りに集中する / Cloud Run は bun イメージ運用で Dockerfile を作り替え / 新しめで、ハッカソンで踏みたくない不確実性が増える

## 結果

- 依存は pnpm で管理し `pnpm-lock.yaml` を版管理する。Node ベースの Dockerfile でビルド・起動する。
- ビルド系との相性リスクを避けつつ、npm より高速な install で開発サイクルを改善できる。

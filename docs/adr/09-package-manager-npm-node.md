# 09. パッケージマネージャ/ランタイムに npm + Node を採用する

- status: Accepted
- date: 2026-07-03

## コンテキストと課題

アプリは TypeScript スタック（[ADR-05](05-web-framework-tanstack-start.md) / [ADR-07](07-agent-framework-vercel-ai-sdk.md)）で、ビルド系（Vite・TanStack Start プラグイン・drizzle-kit）はいずれも Node ファースト。デプロイ先は Cloud Run（[ADR-04](04-infra-cloud-run.md)）。パッケージマネージャとランタイムを決める。個人開発・ハッカソンで、基盤のツールで詰まらず実装に時間を割きたい。

## 検討した選択肢

- npm + Node（採用）
- Bun（パッケージマネージャ＋ランタイム一体）
- pnpm + Node

## 決定

パッケージマネージャに npm、ランタイムに Node を採用する。`package-lock.json` をコミットし、Cloud Run 用のコンテナは Node ベースイメージでビルド・起動する。

### 理由

- 最大の互換性。ビルド系（Vite・TanStack Start・drizzle-kit）が公式に Node をターゲットにしており摩擦が最小。
- Cloud Run × Node は最も枯れたデプロイ経路で、既存の Dockerfile・CD（GitHub Actions）と整合する。
- 「動いて当たり前」で、限られた時間をツールのデバッグではなく実装（エージェント/献立ロジック）に使える。

## 各選択肢の比較

### npm + Node（採用）

- 👍 良い点: 最大互換で全ツールがテスト済み / ビルド系が公式 Node ターゲット / Cloud Run の王道 / 既存 scaffold・Dockerfile・CD と整合
- 👎 懸念点: install がやや遅い / 起動が Bun より遅い（Web サーバ用途では体感差は小さい）

### Bun（PM＋ランタイム）

- 👍 良い点: install/実行が速く、PM・ランタイム・テストが一体。TS を直接実行できる DX
- 👎 不採用の理由: ビルド系が Node 前提のため相性リスクがまさにビルド周りに集中する / Cloud Run は bun イメージ運用で Dockerfile を作り替え / 新しめで、ハッカソンで踏みたくない不確実性が増える

### pnpm + Node

- 👍 良い点: npm より高速・省ディスクな PM。ランタイムは Node のまま堅い
- 👎 不採用の理由: 今回の規模では npm との差が小さく、標準の npm で十分（PM を増やす理由が薄い）

## 結果

- 依存は npm で管理し `package-lock.json` を版管理する。Node ベースの Dockerfile でビルド・起動する。
- ビルド系との相性リスクを避け、実装に集中できる。
- install/起動の速度が課題化した場合は、ランタイムは Node のまま pnpm への移行を後続 ADR で再検討する。

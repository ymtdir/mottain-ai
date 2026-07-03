# 11. リント/フォーマット/テストに ESLint + Prettier + Vitest を採用する

- status: Accepted
- date: 2026-07-03

## コンテキストと課題

TypeScript スタック（[ADR-05](05-web-framework-tanstack-start.md) / [ADR-10](10-frontend-ui-shadcn-tailwind.md)）のリント・フォーマット・テストツールを決める。候補は ESLint + Prettier の組み合わせと、両者を一体で担う Biome。テストランナーは Vite ベースのプロジェクトと相性の良い Vitest を想定。

## 検討した選択肢

- ESLint + Prettier（採用）
- Biome（リント・フォーマット一体）

## 決定

- **リント**: ESLint（`@tanstack/eslint-config`）
- **フォーマット**: Prettier（`prettier-plugin-tailwindcss` で Tailwind クラスの順序を自動整理）
- **テスト**: Vitest（単体・統合テストのみ。コンポーネント/E2E テストは対象外）

### 理由

- 採用した TanStack Start + shadcn の初期スキャフォールドに ESLint + Prettier + Vitest が最初から組み込まれていた。これをそのまま使うのが素直で、追加のセットアップやツール差し替えの手間がかからない。
- `@tanstack/eslint-config` は TanStack 向けルールを含み、フレームワークとの整合性が高い。
- `prettier-plugin-tailwindcss` により Tailwind クラスの順序が自動統一され、レビューノイズを減らせる。
- Vitest は Vite と統合されており、設定が最小で済む。`@testing-library/react` + `jsdom` も同梱されており、すぐに使える状態になっている。

## 各選択肢の比較

### ESLint + Prettier（採用）

- 👍 良い点: スキャフォールドに同梱済みで即使える / `@tanstack/eslint-config` でフレームワーク向けルールが揃う / `prettier-plugin-tailwindcss` で Tailwind クラス順序を自動整理 / エコシステムが最大で情報が豊富
- 👎 懸念点: ツールが2つに分かれる / Biome より設定が多め

### Biome

- 👍 良い点: リント・フォーマット一体で高速 / 設定ファイルが少ない
- 👎 不採用の理由: スキャフォールドが ESLint + Prettier を前提に生成するため、Biome へ切り替えると設定を作り直す手間が発生する。ハッカソンの限られた時間でその摩擦を避けた

## 結果

- スキャフォールド同梱の ESLint + Prettier + Vitest をそのまま使い、セットアップコストをかけずに品質ゲートを効かせる。
- `pnpm lint` でリント、`pnpm format` でフォーマット、`pnpm test` でテストを実行する。
- トレードオフ: Biome の一体運用・速度は得られないが、今回の規模では影響は小さい。

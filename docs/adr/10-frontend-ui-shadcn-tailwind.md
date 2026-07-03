# 10. フロントエンド UI に shadcn/ui + Tailwind CSS を採用する

- status: Accepted
- date: 2026-07-03

## コンテキストと課題

アプリは TypeScript / TanStack Start / React 19（[ADR-05](05-web-framework-tanstack-start.md)）。チャットに加え、献立カード・買い物リスト・根拠パネルなど動的な表示が主役で、ハッカソンでも見栄え良く速く作りたい。UI コンポーネントとスタイリングの方針を決める。

## 検討した選択肢

- shadcn/ui + Tailwind CSS（採用）
- コンポーネントライブラリ（Mantine / Chakra / MUI）
- CSS Modules / 素の CSS
- ゼロランタイム CSS-in-TS（Panda CSS / vanilla-extract）

## 決定

UI に shadcn/ui（Radix ベースのコンポーネントを"コピーして持つ"方式）、スタイリングに Tailwind CSS を採用する。チャット周りは必要に応じて Vercel AI SDK の AI Elements を用いる。

### 理由

- Vite / TanStack Start / React 19 で問題なく動く（shadcn は Vite 対応）。
- Vercel AI SDK の AI Elements（チャットUI部品）が shadcn + Tailwind 前提のため、チャット・ストリーミング表示を素早く綺麗に組める（[ADR-07](07-agent-framework-vercel-ai-sdk.md) と相乗）。
- コンポーネントを自分のコードとして持てるため、献立カード等の独自 UI を作り込みやすい。

## 各選択肢の比較

### shadcn/ui + Tailwind CSS（採用）

- 👍 良い点: 軽量でカスタム性が高い / AI Elements と相乗でチャットUIが速い / Vite・React 19 で動く / npm 依存を抱え込まない
- 👎 懸念点: 初期セットアップ（Tailwind + shadcn init）が要る / ユーティリティクラスの学習

### コンポーネントライブラリ（Mantine / Chakra / MUI）

- 👍 良い点: 即使えるコンポーネント群とテーマ
- 👎 不採用の理由: 重め・意見が強く、独自 UI の作り込みが窮屈。AI Elements との相乗も薄い

### CSS Modules / 素の CSS

- 👍 良い点: 依存最小・透明
- 👎 不採用の理由: リッチなチャット/献立 UI を作る速度が落ちる

### ゼロランタイム CSS-in-TS（Panda / vanilla-extract）

- 👍 良い点: 型安全なスタイリング
- 👎 不採用の理由: セットアップが増え、shadcn/AI Elements の資産を活かしにくい

## 結果

- Tailwind CSS と shadcn/ui を導入し、チャットは AI Elements を土台に、献立カード・買い物リスト・根拠パネルは shadcn ベースで自作する。
- 具体的なセットアップ（Tailwind v4 設定・shadcn init・テーマ）は実装フェーズで行う。

# 05. Web/フルスタックフレームワークに TanStack Start を採用する

- status: Accepted
- date: 2026-07-03

## コンテキストと課題

mottain-ai は Cloud Run にデプロイする、チャット中心で高インタラクティブな献立エージェントの Web アプリである（実行基盤 Cloud Run / Cloud SQL for PostgreSQL は ADR-04 で確定）。UI/フルスタックのフレームワークを TypeScript 前提で決めたい。候補は Next.js と TanStack Start の2つ。個人開発・ハッカソンの軽さ（constitution 原則 I）と、エージェントが価値の中心（原則 V）を踏まえて選ぶ。

## 検討した選択肢

- TanStack Start（採用）
- Next.js 16

## 決定

Web/フルスタックフレームワークに TanStack Start（TypeScript・React・Vite ベース、v1.0 は 2026年3月に安定）を採用する。ビルドした Node サーバを Docker 化して Cloud Run にデプロイする。

### 理由

- 高インタラクティブなチャット/SaaS 型アプリには、クライアント優先でルート単位に SSR を足すモデルが素直で、RSC のデフォルトと戦わずに済む。
- ルート・ローダ・サーバー関数の入出力までエンドツーエンドで型が付き、ランタイムバグを減らせる。アレルギー回避などデータ契約の正しさに効く。
- Vite により開発（起動・HMR・CI ビルド）が速く、ハッカソンの反復に有利。
- デプロイ先が Cloud Run（Vercel ではない）ため、Next.js のプラットフォーム優位が効かない。Start は素の Docker/Node サーバとして Cloud Run に素直に乗る。
- ストリーミングチャットの定番 Vercel AI SDK はフレームワーク非依存で Start でも使えるため、Next.js の「チャット例が多い」利点は限定的。

## 各選択肢の比較

### TanStack Start（採用）

- 👍 良い点: クライアント優先で高インタラクティブ UI に好適 / エンドツーエンドの型安全 / Vite で高速 / Docker で Cloud Run に素直 / 基盤（Router・Query・Vite）は実績十分
- 👎 懸念点: Next.js よりエコシステム・情報量が小さい / v1.0 が新しめ（2026年3月）で事例が少ない領域は自前実装になりうる

### Next.js 16

- 👍 良い点: 成熟した巨大エコシステムで情報量が多く、詰まった時に解決しやすい / RSC でコンテンツ系に強い
- 👎 不採用の理由: RSC 優先モデルが高インタラクティブ画面で摩擦になりやすい / 強みの多くが Vercel 前提で、Cloud Run デプロイでは活きにくい

## 結果

- TypeScript・型安全・Vite の速さを土台に、チャット中心 UI を素早く作れる。
- Cloud Run 単一サービスで配信でき、運用が軽い（YAGNI）。
- トレードオフ: エコシステムが小さいぶん、事例が少ない領域は自前実装が要る。
- 今後のフォロー: エージェントの実装言語（ADK の Python か TypeScript か）は本 ADR の範囲外。別 ADR で決める。ADK-TS は永続セッション不足等の成熟度の穴があるため、堅さ優先なら Python ADK を別サービスにする案も含めて検討する。

# 07. エージェント/オーケストレーション層に Vercel AI SDK を採用する（ADK 不採用）

- status: Accepted
- date: 2026-07-03

## コンテキストと課題

ADR-05 で Web/フルスタックを TanStack Start（TypeScript）に、[ADR-06](06-ai-core-gemini-enterprise-agent-platform.md) で AI コアを Gemini Enterprise Agent Platform（Gemini）に決めた。本 ADR では、価値の中心であるエージェントを「どのフレームワークで実装するか」を決める。候補は Google の ADK（Gemini Enterprise Agent Platform 純正のエージェントフレームワーク）と Vercel AI SDK（TypeScript エコシステムの標準的な AI ツールキット）。本プロダクトで特に重視するのは ①タスク別のモデル使い分け（コスト抑制、research R6）、②エージェントとのチャット UI/UX。加えて YAGNI（単一エージェント＋ツールで足り、マルチエージェントは不要）を踏まえる。

## 検討した選択肢

- Vercel AI SDK（採用。Gemini は Gemini Enterprise Agent Platform 経由）
- Google ADK（TypeScript もしくは Python）

## 決定

エージェント/オーケストレーション層に Vercel AI SDK（TypeScript）を採用する。モデルは Gemini Enterprise Agent Platform 経由で Gemini を呼ぶ（AI SDK の Google プロバイダを用いる。具体的なプロバイダパッケージは実装時に確定）。エージェントは「ツールを使う単一ループ」として TanStack Start のサーバー関数に実装する。ADK は採用しない。

### 理由

- モデルの使い分けが一級市民。呼び出しごとにモデルを差し替えられ、解析＝軽量モデル、献立計画＝上位モデル、イラスト＝画像モデル、という R6 のコスト抑制を素直に実装できる。
- チャット UI/UX が看板機能。`useChat`・ストリーミング・ツール実行の途中表示・Generative UI により、献立/買い物リスト/根拠パネルをストリーミング中にリッチに描画でき、根拠可視化（FR-018）にも寄与する。
- 成熟した TypeScript ネイティブで、TanStack Start（ADR-05）と一気通貫。ADK-TS の未成熟（永続化非搭載・パッケージングの穴）を回避できる。
- マルチエージェントは不要（単一エージェント＋ツールで足りる）→ YAGNI。
- 前提の両立。Gemini Enterprise Agent Platform 経由で Gemini を使うため、当該プラットフォームを使う前提は満たす。Cloud Run × Gemini でハッカソンの GCP 要件も満たす。

## 各選択肢の比較

### Vercel AI SDK（採用）

- 👍 良い点: プロバイダ非依存でモデル使い分けが容易 / チャット UI/UX（`useChat`・ストリーミング・Generative UI）が最強 / 成熟・TS ネイティブ / TanStack Start と一気通貫 / 単一サービス
- 👎 懸念点: ADK のような「エージェント基盤（マルチエージェント・評価・Agent Runtime）」は薄く、必要なら自前 / Gemini Enterprise Agent Platform への「プラットフォーム純正」色は出ない

### Google ADK（TypeScript / Python）

- 👍 良い点: Agent Platform 純正でマルチエージェント・セッション/メモリ・評価・Agent Runtime を備える / プラットフォーム作品としての打ち出しが強い
- 👎 不採用の理由: 本件はモデル使い分けとチャット UI/UX が主眼で、そこは AI SDK が上回る / TS 版は未成熟（永続化・パッケージングの穴）/ Python 版は2言語・2サービスで YAGNI に反する / マルチエージェント不要で ADK の強みが活きない

## 結果

- モデル使い分けとリッチなチャット UX を、成熟した TypeScript スタックで一気通貫に実装できる。
- Gemini は Gemini Enterprise Agent Platform 経由で使い、前提（Gemini 利用・GCP デプロイ）を満たす。
- 単一 Cloud Run サービスで運用が軽い（YAGNI）。
- ガードレール（アレルギー回避の決定的フィルタ、research R5）や好み学習（R4）、会話状態の永続化（R8）は、AI SDK のツールおよびサーバー側ロジック＋ Postgres として実装する。
- トレードオフと将来: マルチエージェントや Agent Platform 純正機能（評価・Agent Runtime 等）が必要になれば、ADK 導入を後続 ADR で再検討する（その場合は本 ADR を `Superseded by` に更新しうる）。

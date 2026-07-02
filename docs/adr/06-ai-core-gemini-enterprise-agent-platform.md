# 06. AI コアに Gemini Enterprise Agent Platform（Gemini）を採用する

- status: Accepted
- date: 2026-07-03

## コンテキストと課題

mottain-ai の価値の中心は AI エージェントであり（constitution 原則 V）、その頭脳となる LLM（モデル）とその提供プラットフォームを決める必要がある。本作品は GCP にデプロイして提出するハッカソン作品で、応募要件として Google Cloud のプロダクト利用が前提。constitution のプロダクト前提でも AI コアに Gemini Enterprise Agent Platform および Gemini を想定している。実行基盤は Cloud Run（[ADR-04](04-infra-cloud-run.md)）。この文脈で、モデル/プラットフォームを確定する。

なお「どのフレームワークでエージェントを実装するか（ADK か Vercel AI SDK か）」は本 ADR の範囲外とし、別の ADR で扱う。本 ADR はモデル/プラットフォームのみを決める。

## 検討した選択肢

- Gemini Enterprise Agent Platform（Gemini。GCP 上のエンタープライズ経路）（採用）
- Gemini Developer API（AI Studio 経由の Gemini）
- 他社 LLM（OpenAI / Anthropic 等）

## 決定

AI コアに Gemini Enterprise Agent Platform（旧称からの現行名）上の Gemini を採用する。テキスト生成は Gemini、レシピのイラストは同プラットフォームの画像生成モデルを用いる。タスクに応じてモデルを使い分ける（軽量モデル/上位モデル/画像モデル）。

### 理由

- ハッカソンの GCP 利用要件と constitution の前提に合致し、Cloud Run（ADR-04）と同一クラウドに統合できる（IAM・課金・観測性を GCP に一本化）。
- Gemini はテキストと画像生成をカバーし、モデル使い分けでコストを抑えられる（research R6）。
- エンタープライズ経路（Agent Platform）は、AI Studio の開発者向け経路に比べ、本番/提出に適した GCP 統合・ガバナンスを備える。

## 各選択肢の比較

### Gemini Enterprise Agent Platform（採用）

- 👍 良い点: GCP 要件・前提に合致 / Cloud Run と同一クラウドで統合が容易 / テキスト＋画像をカバー / エンタープライズの課金・IAM・観測性
- 👎 懸念点: GCP プロジェクト・認証のセットアップが要る / モデル ID や価格はモデル世代で変わりうる

### Gemini Developer API（AI Studio）

- 👍 良い点: セットアップが手軽で個人開発の入口として速い
- 👎 不採用の理由: GCP のエンタープライズ統合（IAM・課金・観測性）が弱く、GCP デプロイ作品の本筋から外れる。提出要件・前提に照らして Platform 経路が適切

### 他社 LLM（OpenAI / Anthropic 等）

- 👍 良い点: モデル性能の選択肢が広い
- 👎 不採用の理由: GCP 利用の応募要件と constitution の前提（Gemini）に反する

## 結果

- AI コアを Gemini に統一し、Cloud Run と同一の GCP に載せて運用・課金・認証を一本化できる。
- モデル使い分け（軽量/上位/画像）でコスト暴走を抑える設計に接続する（research R6）。
- 具体的なモデル ID（Gemini の世代・画像生成モデル）の選定は、コスト/品質のバランスを見て実装時に確定する。
- エージェントの実装フレームワークは本 ADR の範囲外で、別の ADR で決める。

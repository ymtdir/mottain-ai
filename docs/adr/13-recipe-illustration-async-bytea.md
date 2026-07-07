# 13. レシピイラストの非同期生成と画像保存方式にクライアント起点発火＋Postgres bytea を採用する

- status: Accepted
- date: 2026-07-06

## コンテキストと課題

feature 002（レシピカード）では、お気に入り登録したレシピに料理のイラストを添える（US3）。要件は「登録は生成を待たず即時完了する」「生成はバックエンドで非同期に行う」「タブを閉じても後で回復できる」「生成の成否が保存・一覧・材料/手順の閲覧を妨げない」（FR-011〜016）。

ここで Cloud Run（[ADR-04](04-infra-cloud-run.md)）の制約が効く。Cloud Run はレスポンス返却後に CPU がスロットルされうるため、登録ハンドラ内で `await` しないバックグラウンド Promise は完走が保証されない。つまり「登録レスポンスを返しつつ裏で生成を走らせ切る」を素朴には実現できない。一方でハッカソン規模（単一ユーザー・数十〜数百件・画像 1 枚 ≲ 1–2MB）で新インフラ（キュー・常駐ワーカー・GCS バケット・IAM・Terraform）を足すのは過剰（YAGNI／憲章 I）。

そこで「①生成をどう非同期に走らせるか」と「②生成画像をどこに保存し、どう配信するか」の 2 点を本 ADR でまとめて決める。

## 検討した選択肢

生成の非同期実行方式:

- クライアント起点の fire-and-forget 発火＋生成エンドポイント内で実行（採用）
- Cloud Tasks 起点（登録ハンドラが enqueue → タスクが生成エンドポイントを叩く）
- 登録ハンドラ内のバックグラウンド Promise

画像の保存・配信:

- Postgres `bytea` 列に保持しアプリ経由で配信（採用）
- Cloud Storage（GCS）に保存し署名 URL／CDN で配信

## 決定

MVP は次の方式を採用する。

**生成**: 登録時にレシピを `illustrationStatus=pending` で保存して即時応答する。クライアントは `POST /api/recipes/{id}/illustration` を fire-and-forget で発火する。生成そのものはこのエンドポイントのリクエスト内で実行する（CPU が割り当たる文脈で走らせる）。カードを開いた際に status が `pending`／`failed`、または **stale な `generating`**（リース期限切れ）なら生成を（再）保証する。手動再試行（FR-015）も同じエンドポイントで受ける。生成モデルは既存の `@ai-sdk/google-vertex` 経由の Gemini 画像モデル（`gemini-3.1-flash-image`）を Vercel AI SDK の `generateText`（`responseModalities: ["TEXT","IMAGE"]` で画像出力を得る）で呼ぶ（[ADR-07](07-agent-framework-vercel-ai-sdk.md) の延長）。当初は Imagen（`experimental_generateImage`）を想定していたが、Imagen 4 系 API が 2026-06-24 に終了し画像生成が Gemini API へ統合されたため、Gemini 画像モデルへ移行した。なお当該モデルは `global` ロケーションで提供されるため、画像用のロケーションは `GOOGLE_CLOUD_IMAGE_LOCATION`（既定 `global`）で上書きする。

**保存・配信**: 生成した画像バイトと MIME を Postgres の `bytea` 列に保持し、`GET /api/recipes/{id}/illustration` で `Content-Type`・キャッシュヘッダ付きにストリーム配信する。一覧応答には画像バイトを載せない（メタと status のみ／INV-2）。

### 理由

- 生成を「独立したリクエスト」に閉じ込めれば、その処理の間は CPU が割り当たり確実に完了する。Cloud Run のスロットル問題を回避しつつ、キューや常駐ワーカーを足さずに「登録は即時・生成は非同期・タブを閉じても後で回復可能」を満たせる。
- カード開封時の生成保証＋手動再試行で、発火が失われたケースも回復する。生成中にクラッシュ・再起動しても、`generating` を「リース」とみなし期限切れ（stale）を再キック対象にすることで永久固定を防ぐ。
- 画像は既存の Cloud SQL だけで完結する。GCS バケット・IAM・署名 URL が不要で、配信をアプリ経由にすることで公開バケットの権限設計も要らない。単一ユーザー・数百件・1 枚 ≲ 1–2MB の規模では DB 保持で十分。
- いずれも新規 GCP インフラを増やさない（生成＝既存の Gemini 画像モデル、保存＝既存 Postgres）。

## 各選択肢の比較

### クライアント起点の fire-and-forget 発火＋生成エンドポイント内で実行（採用・生成）

- 👍 良い点: 新インフラ不要 / 生成中は CPU が割り当たり完走が保証される / 開封時保証＋手動再試行で発火喪失から回復 / stale リースで永久固定を防止
- 👎 懸念点: 発火はクライアント依存（初回発火が失われうる→開封時保証で補う） / 生成の重さはリクエスト時間に乗る / 厳密なリトライ制御はキューほど堅牢でない

### Cloud Tasks 起点（不採用・生成）

- 👍 良い点: バックエンド完結で最も堅牢 / リトライ・レート制御が組み込み
- 👎 不採用の理由: キュー・IAM・Terraform の追加が必要でハッカソン規模には過剰（YAGNI）。**スケール・信頼性が要件化したら移行する upgrade path** とする。

### 登録ハンドラ内のバックグラウンド Promise（不採用・生成）

- 👍 良い点: 実装が最も単純
- 👎 不採用の理由: Cloud Run はレスポンス後に CPU がスロットルされ、`await` しない Promise の完走が保証されない。要件を満たせない。

### Postgres `bytea` に保持しアプリ経由で配信（採用・保存）

- 👍 良い点: 既存 Cloud SQL だけで完結 / バケット・IAM・署名 URL 不要 / 配信権限をアプリで制御 / この規模では十分
- 👎 懸念点: DB 肥大・大容量配信には不向き / DB 帯域を画像配信に使う

### Cloud Storage（GCS）に保存し署名 URL／CDN で配信（不採用・保存）

- 👍 良い点: 大量・大容量・CDN 配信に最適で本番向き
- 👎 不採用の理由: バケット／IAM／Terraform の追加が必要で現規模には過剰。**件数・容量が増えたら移行する upgrade path** とする。

## 結果

- 新規 GCP インフラを一切増やさずに、非同期イラスト生成・状態表示・stale 復旧を実装できる。
- 状態遷移（`pending`→`generating`→`ready`/`failed`、`failed`→`generating` 再試行、非 stale の `generating` は冪等で再キックしない、stale な `generating` は再キック）は [data-model.md](../../specs/002-recipe-card/data-model.md) を正とし、`src/server/services/saved-recipe.ts` に実装する。
- トレードオフと将来: スケール・信頼性が要件化したら生成を Cloud Tasks 起点へ、件数・容量が増えたら画像を GCS へ移行する。その際は本 ADR を後続 ADR で `Superseded by` に更新しうる。

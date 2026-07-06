# Research: レシピカード（お気に入り登録・カード表示）

Phase 0 の設計判断。既存スタック（001）を前提に、本機能で新たに決める点だけを扱う。

## R1. イラスト生成の非同期実行方式（Cloud Run 制約下）

- **Decision**: MVP は「登録時にレシピを status=`pending` で保存し即時応答 → クライアントが生成エンドポイント `POST /api/recipes/{id}/illustration` を fire-and-forget で発火 → カードを開いた際に status が `pending`/`failed`、または **stale な `generating`**（リース期限切れ）なら生成を（再）保証」する方式。生成そのものはサーバーの当該エンドポイントのリクエスト内で実行する（CPU が割り当たる文脈で走る）。
- **Rationale**: Cloud Run はレスポンス後に CPU がスロットルされうるため、登録ハンドラ内で `await` しないバックグラウンド Promise は完走が保証されない。生成を「独立したリクエスト」に閉じ込めれば、その処理の間は CPU が割り当たり確実に完了する。新インフラ（キュー・常駐ワーカー）を足さずに「登録は即時・生成は非同期・タブを閉じても後で回復可能」を満たせる（YAGNI／憲章 I）。カード開封時の生成保証＋手動再試行（FR-015）で、発火が失われたケースも回復する。生成中にクラッシュ・再起動しても、`generating` を「リース」とみなし期限切れ（stale）を再キック対象にすることで永久固定を防ぐ（状態遷移の詳細は [data-model.md](./data-model.md)）。
- **Alternatives considered**:
  - **Cloud Tasks 起点**（登録ハンドラがタスクを enqueue → タスクが生成エンドポイントを叩く）: バックエンド完結で最も堅牢。ただしキュー・IAM・Terraform の追加が必要でハッカソン規模には過剰。**スケール・信頼性が要件化したら移行する upgrade path** とする。
  - **登録ハンドラ内の未 await バックグラウンド実行**: Cloud Run のスロットルで完走が不確実。不採用。
  - **min-instances / CPU always allocated ＋プロセス内ジョブ**: ゼロスケールのコスト利点を失う。不採用。
- **ADR**: この判断は `create-adr` で ADR 化する（実装前）。

## R2. 生成画像の保存先

- **Decision**: MVP は Postgres の `bytea` 列に画像バイトを保持し、`GET /api/recipes/{id}/illustration` でストリーム配信する（適切な `Content-Type`・キャッシュヘッダを付与）。
- **Rationale**: 既存の Cloud SQL だけで完結し、新インフラ（GCS バケット・IAM・署名 URL）が不要（YAGNI）。単一ユーザー・数十〜数百件・1枚 ≲ 1–2MB の規模では DB 保持で十分。配信をアプリ経由にすることで公開バケットの権限設計も不要。
- **Alternatives considered**:
  - **Cloud Storage（GCS）**: 大量・大容量・CDN 配信に最適で本番向き。ただしバケット/IAM/Terraform 追加が必要。**件数・容量が増えたら移行する upgrade path**。
  - **JSONB に data URL（base64）で埋める**: 行が肥大し一覧取得が重くなる。不採用。
- **ADR**: R1 と同じ ADR にまとめて記録する。

## R3. イラスト生成モデル（Imagen）

- **Decision**: 既存の `@ai-sdk/google-vertex` プロバイダ経由で Imagen を用い、Vercel AI SDK の `experimental_generateImage` で生成する。プロバイダラッパは `src/server/model/imagen.ts` に `gemini.ts` と同じ遅延生成パターンで実装する。具体のモデル ID・画像サイズ・枚数（1枚）は実装時に確定。
- **Rationale**: ADR-06（Gemini Enterprise Agent Platform）・ADR-07（Vercel AI SDK）の範囲内で、新規依存も新規 ADR も不要。認証は既存の ADC（`GOOGLE_CLOUD_PROJECT`/`GOOGLE_CLOUD_LOCATION`）をそのまま使える。
- **Alternatives considered**: 外部画像生成 API（別ベンダー）: 認証・課金・ADR が増える。不採用。

## R4. 生成状況の UI への反映方法

- **Decision**: レシピ一覧は既存流儀どおり「開いた時に fetch」で取得する。未完了（`pending`/`generating`）のレシピが一覧に含まれる間だけ、軽いポーリング（数秒間隔）で状態を更新する。未完了が無くなればポーリングを止める。
- **Rationale**: SSE/WebSocket を足さずに「生成中→表示」の切り替え（Edge Case）を満たせる（YAGNI）。既存の `routes/index.tsx` の fetch パターンと一貫。
- **Alternatives considered**: SSE ストリーミング購読: 常時接続の実装コストが要件に見合わない。不採用。手動リロードのみ: 生成完了の反映が悪くステータス表示要件（SC-008）に不足。不採用。

## R5. 保存レシピの重複判定（アイデンティティ）

- **Decision**: 重複判定キーは「正規化したレシピ名（title の trim＋空白畳み込み）」＋ユーザー。既登録なら二重に増やさず「登録済み」として扱う（FR-004）。DB では `(user_id, normalized_title)` に一意制約を張る。
- **Rationale**: 001 の好み（`recipeAdjustments` を `recipeName` でキー）と一貫。ユーザーが体感する同一性は料理名で十分（MVP・単一世帯）。ハッシュ等の厳密同定は過剰（YAGNI）。
- **Alternatives considered**: 材料・手順まで含めたコンテンツハッシュで同定: 微差で別物になり UX に合わない。不採用。

## R6. レシピ内容のデータ形状（001 との整合）

- **Decision**: 保存するレシピ内容は 001 の `Recipe`（`title` / `ingredients: {name, amount|null}[]` / `steps: string[]` / `notes: string|null`）をそのまま JSONB で保持する（`day` は献立内の位置情報なので保存対象から除く）。「材料・手順は LLM 出力と同じ形式」（spec）はこの型で満たす。
- **Rationale**: 型を再利用でき、`MealPlanCard` と同じ描画ロジックを共有できる。変換・写像の実装が最小。
- **Alternatives considered**: 保存用に別スキーマを定義: 二重管理になり不整合の温床。不採用。

## まとめ（未解決なし）

- 新規 GCP インフラは MVP では追加しない（生成＝既存の Gemini Enterprise Agent Platform（Imagen）、保存＝既存 Postgres）。
- 実装前フォロー: R1・R2 を1つの ADR にまとめて記録する（`create-adr`）。
- NEEDS CLARIFICATION は残っていない。

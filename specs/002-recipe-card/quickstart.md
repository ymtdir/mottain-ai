# Quickstart: レシピカード（お気に入り登録・カード表示）

本機能をエンドツーエンドで検証する手順。詳細な型・遷移は [data-model.md](./data-model.md)、設計判断は [research.md](./research.md) を参照。

## 前提

- 001（献立コア）が動作し、チャットで献立（`MealPlanCard`）が提案できること。
- ローカル DB（Cloud SQL 相当の Postgres）に接続でき、`saved_recipes` のマイグレーションが適用済みであること。
- Gemini Enterprise Agent Platform（Imagen）へ ADC で認証できること（`gcloud auth application-default login`、`GOOGLE_CLOUD_PROJECT` / `GOOGLE_CLOUD_LOCATION`）。イラスト生成の検証時のみ必要。

## 実行

```bash
pnpm install
pnpm dev        # 開発サーバ
pnpm check      # lint / typecheck / test（コミット前）
pnpm test       # Vitest（サービスの単体テスト）
```

## 検証シナリオ

### US1: お気に入り登録（P1）

1. チャットで献立を提案させ、`MealPlanCard` の一品に付いた保存ボタンを押す。
2. 期待: 生成完了を待たず即時に「登録済み」表示に変わる（SC-007 / FR-011）。
3. ページを再読み込みし、保存レシピ一覧に当該レシピが残っていることを確認（永続化 / SC-002）。
4. 同じレシピをもう一度登録しようとしても二重に増えないことを確認（FR-004）。

### US2: カード一覧・閲覧（P1）

1. サイドバーの「保存レシピ」を開く。
2. 期待: 登録済みレシピがカード一覧で表示され、各カードにレシピ名と画像欄が出る（FR-006/007）。
3. カードを選ぶと材料・手順が提案時と同じ形式で表示される（FR-008、`MealPlanCard` と同じ描画）。
4. 0件のときは空状態が出てエラーにならない（FR-009 / SC-005）。

### US3: 非同期イラスト（P2）

1. 登録直後にカードを開く → 画像欄が「生成中」表示（FR-014、status=`pending`/`generating`）。
2. 数秒後（ポーリング）に生成が完了 → 画像欄にイラストが表示（`ready`、`GET /api/recipes/{id}/illustration`）。
3. 生成失敗を再現（例: 一時的に生成を失敗させる） → 画像欄が「生成失敗」表示になり、再試行ボタンが出る（FR-015）。
4. 再試行で成功すればイラストが表示される（SC-009）。
5. どの状態でも材料・手順の閲覧はできる（FR-016）。

### US4: 削除（P3）

1. 保存レシピを削除する → 一覧から消える。
2. 再読み込み後も復活しない（SC-006）。

## 自動テスト（Vitest・コロケーション）

`src/server/services/saved-recipe.test.ts` で決定的ロジックを検証する（画像の実生成は呼ばない）:

- 正規化タイトルによる重複判定（同名は増やさない／別名は増える）
- 空題レシピの登録拒否・空 steps レシピの許容
- 状態遷移（`pending`→`generating`→`ready`/`failed`、`failed`→`generating` 再試行、`generating` 中の再発火が二重生成しない冪等性）
- 一覧応答に画像バイトを含めないこと

## 完了の目安

- 上記 US1〜US4 の期待がすべて満たされる。
- `pnpm check` がグリーン。
- R1/R2 の ADR が作成済み（`create-adr`）。

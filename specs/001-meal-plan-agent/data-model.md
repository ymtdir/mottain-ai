# Data Model（ドメインモデル）: 食材使い切り献立エージェント

**Date**: 2026-07-03 | **Branch**: `001-meal-plan-agent` | **Spec**: [spec.md](./spec.md)

本書はドメインモデルを主とし、①エンティティと関係 → ②不変条件 → ③状態遷移 → ④永続化マッピング（保存の詳細は末尾）の順で記述する。MVP は単一世帯を対象とし、世帯を集約のルートとして扱う。

## 1. エンティティと関係

- **世帯 (Household)** — 集約ルート。大人の人数と、子供を年齢帯（未就学児 / 小学生 / 中学生以上）で区分した人数を持つ。分量算定の基準。
- **回避制約 (DietaryConstraint)** — 世帯に属する。アレルギー・苦手食材の一覧。提案に対する絶対的な除外条件。
- **在庫アイテム (InventoryItem)** — 世帯に属する。品目・概算数量（単位付き）。個別の消費期限は持たない（一般的な日持ちはドメイン知識）。
- **献立 (MealPlan)** — 世帯に属する。対象期間（1〜7日）と状態（提案中 / 確定）を持つ。夕食1食のみ。
- **レシピ／食事 (Recipe)** — 献立の各日に属する（夕食1件/日）。必要な食材と数量、手順の要点、ジャンル・味付けの属性。
- **買い物リスト (ShoppingList)** — 献立に 1:1 で属する。手持ちで不足するぶんの食材（品目・数量）のみ。
- **提案の根拠 (Rationale)** — 献立に 1:1 で属する。使い切り対象・回避した制約食材・反映した好みなど。
- **評価 (Rating)** — レシピに属する。5段階評価＋任意の自由記述コメント。好み学習の入力。
- **味の感想 (FlavorFeedback)** — 評価に 0..1 で属する。コメントから解釈した感覚的な味の感想と、そこから導いた具体的な調整。
- **好みプロファイル (PreferenceProfile)** — 世帯に 1:1。学習した料理のジャンル・傾向、および味付けの傾向（塩加減・辛さ・こってり等の軸）。
- **保存レシピ (SavedRecipe)** — 世帯に属する。ユーザーが保存したレシピ。
- **レシピイラスト (RecipeImage)** — レシピに 0..1。確定または明示要求時に生成される仕上がりイメージ。
- **会話セッション (Conversation)** — 世帯に属する。在庫把握・提案・修正のやり取りの文脈。

### 関係（多重度）

```text
Household 1—1 DietaryConstraint
Household 1—1 PreferenceProfile
Household 1—N InventoryItem
Household 1—N MealPlan
Household 1—N SavedRecipe
Household 1—N Conversation
MealPlan  1—N Recipe            （各日の夕食）
MealPlan  1—1 ShoppingList
MealPlan  1—1 Rationale
Recipe    1—N Rating
Recipe    1—0..1 RecipeImage
Rating    1—0..1 FlavorFeedback
```

## 2. 不変条件（Invariants）

- **INV-1（ガードレール／最優先）**: 提案（Recipe・ShoppingList・RecipeImage）に、世帯の DietaryConstraint に含まれる食材を一切含めない。回避すると成立しない場合は混入させず、その旨と代替案を返す。（FR-013/014、SC-001）
- **INV-2**: ShoppingList は「必要量 − 手持ち量」の不足分のみで構成する。手持ちで足りる食材を含めない。（FR-008、SC-002）
- **INV-3**: 分量・買い物数量は世帯構成に合わせる。子供は年齢帯ごとの分量係数を用いる。（FR-009/010a）
- **INV-4**: MealPlan の対象日数は 1〜7 日。範囲外は上限内に収めるよう案内する。（FR-005/031）
- **INV-5**: 提案された MealPlan には必ず Rationale が存在する。（FR-018、SC-004）
- **INV-6**: RecipeImage は確定または明示要求時のみ生成し、修正のたびに再生成しない。（FR-025/026）
- **INV-7（優先順位）**: DietaryConstraint（回避）は、使い切り最適化・好み反映のいずれよりも常に優先される。

## 3. 状態遷移

### 在庫アイテムのライフサイクル

```text
手持ち（on-hand）
  ── 献立を確定 ──▶ 使用予定分を減算（FR-027）
  ── 買い物リスト分を購入 ──▶ 在庫へ加算（FR-028）
      └─ リスト提示量より多く購入 ──▶ 余剰を次回の手持ちへ持ち越し
```

### 献立 (MealPlan) の状態

```text
提案中(proposed) ──[チャットで修正を反復]──▶ 提案中(proposed)
提案中(proposed) ──[確定]──▶ 確定(confirmed)
  確定時: 在庫を減算（FR-027）／ イラスト生成が可能になる（INV-6）
```

### 日持ち（鮮度）の扱い

- 傷みやすい食材は献立の早い日に配置する。個別の消費期限は管理せず、一般的な日持ちで判断する。（FR-029）
- 一般的な日持ちを超えて使う提案になる食材には「早めに使う／冷凍など保存を検討」と短い注意を添える。保存判断はユーザーに委ねる。（FR-030）

## 4. 永続化マッピング（Cloud SQL for PostgreSQL、ADR-04）

リレーショナルで持つ実体と、柔軟・可変な構造を JSONB で持つ実体に分ける。

| 保持形態 | エンティティ | 補足 |
|---|---|---|
| **リレーショナル（テーブル）** | Household / InventoryItem / MealPlan / Recipe / ShoppingList（品目行）/ Rating / SavedRecipe / RecipeImage | 件数・集計・参照整合が要るもの |
| **JSONB** | DietaryConstraint / PreferenceProfile（味の傾向含む）/ Rationale / FlavorFeedback / Conversation（メッセージ履歴・文脈） | 構造が可変・入れ子で、都度スキーマ変更したくないもの |

- Household の年齢帯別「分量係数」の具体値は実装時に定義する（本モデルでは係数が年齢帯に対応することのみ規定）。
- 会話/セッション状態は AI SDK がステートレスのため Postgres に永続化し、リクエストごとに必要な文脈を読み込む（research R8）。
